import { PRODUCTS } from '../../../lib/products';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const data = category ? PRODUCTS.filter(p => p.category === category) : PRODUCTS;
  return Response.json(data);
}
