import ProductCard from './ProductCard';

const MOCK_PRODUCTS = [
  {
    id: '1',
    title: 'Vintage Denim Jacket',
    price: 1899,
    location: 'Mumbai',
    image: 'https://placehold.co/600x600/FFD1DC/000000?text=Jacket',
  },
  {
    id: '2',
    title: 'Floral Summer Dress',
    price: 1299,
    location: 'Delhi',
    image: 'https://placehold.co/600x600/FADADD/000000?text=Dress',
  },
  {
    id: '3',
    title: 'Leather Handbag',
    price: 2199,
    location: 'Bangalore',
    image: 'https://placehold.co/600x600/F8BBD0/000000?text=Bag',
  },
  {
    id: '4',
    title: 'White Sneakers',
    price: 1599,
    location: 'Pune',
    image: 'https://placehold.co/600x600/FCE4EC/000000?text=Shoes',
  },
];

export default function ProductGrid() {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {MOCK_PRODUCTS.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
