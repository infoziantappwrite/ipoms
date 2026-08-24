import { redirect } from 'next/navigation';

export default function PendingTaskRedirectPage() {
  redirect('/pending-tasks');
}
