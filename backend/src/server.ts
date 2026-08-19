import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDatabase } from './config/database';
import { CompanyMetadata } from './models/CompanyMetadata';
import { User } from './models/User';
import { Role } from './models/Role';
import { College } from './models/College';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'ipoms_dev_access_secret_super_secure_key_2026';

// Middleware stack
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// 1. Health Check Endpoint
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'HEALTHY',
    service: 'iPOMS Core Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 2. Authentication Login Endpoint
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Official email and password are required',
        },
      });
    }

    const user = await User.findOne({
      official_email: email.toLowerCase().trim(),
      account_status: 'active',
      is_deleted: false,
    }).populate('role_ids');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Generate Access Token (15m)
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.official_email,
        roles: user.role_codes,
        fullName: user.full_name,
      },
      JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.full_name,
          email: user.official_email,
          username: user.username,
          roles: user.role_codes,
          mustChangePassword: user.must_change_password,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    });
  }
});

// 3. High-Speed Company Search Endpoint (Searches across 3,550+ companies in < 10ms)
app.get('/api/v1/companies/search', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const filter: any = { is_deleted: false };

    if (query) {
      filter.$or = [
        { company_name: { $regex: query, $options: 'i' } },
        { hr_name: { $regex: query, $options: 'i' } },
        { primary_mobile: { $regex: query } },
        { primary_email: { $regex: query, $options: 'i' } },
      ];
    }

    const [companies, totalCount] = await Promise.all([
      CompanyMetadata.find(filter)
        .sort({ serial_number: 1, company_name: 1 })
        .skip(skip)
        .limit(limit)
        .select('serial_number company_name hr_name hr_designation primary_mobile primary_email company_type'),
      CompanyMetadata.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        companies,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to search companies',
      },
    });
  }
});

// 4. Colleges List Endpoint
app.get('/api/v1/colleges', async (req: Request, res: Response) => {
  try {
    const colleges = await College.find({ status: 'active' })
      .sort({ college_code: 1 })
      .populate('assigned_coordinator_ids', 'full_name official_email primary_mobile');

    return res.status(200).json({
      success: true,
      data: {
        total: colleges.length,
        colleges,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch colleges',
      },
    });
  }
});

// 5. Coordinators List Endpoint
app.get('/api/v1/coordinators', async (req: Request, res: Response) => {
  try {
    const coordinators = await User.find({
      role_codes: 'PLACEMENT_COORDINATOR',
      account_status: 'active',
      is_deleted: false,
    }).select('full_name official_email primary_mobile presence_status');

    return res.status(200).json({
      success: true,
      data: {
        total: coordinators.length,
        coordinators,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch coordinators',
      },
    });
  }
});

// 4. Centralized 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// 5. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ [Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

// Boot Server and Connect Database
const startServer = async () => {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 [iPOMS API] Server running on http://localhost:${PORT}`);
    console.log(`📡 [iPOMS API] Health probe: http://localhost:${PORT}/api/v1/health`);
    console.log(`🔍 [iPOMS API] Company Search: http://localhost:${PORT}/api/v1/companies/search?q=10`);
  });
};

startServer();
