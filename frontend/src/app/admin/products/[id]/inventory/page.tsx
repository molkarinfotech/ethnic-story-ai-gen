// This page has been replaced by the inline manage panel on /admin/products
// Redirect to the products list
import { redirect } from 'next/navigation';
export default function InventoryRedirect() {
  redirect('/admin/products');
}
