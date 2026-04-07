import Image from "next/image";

export default function CheckoutPage({
  params,
}: {
  params: { id: string };
}) {
  // Mock product (later comes from backend)
  const product = {
    id: params.id,
    title: "Pink Summer Dress",
    price: 1299,
    image: "https://placehold.co/600x600/FADADD/000000?text=Dress",
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product */}
        <div className="flex gap-4 items-center border rounded-2xl p-4">
          <div className="relative w-32 h-32 bg-pink-50 rounded-xl overflow-hidden">
            <Image
              src={product.image}
              alt={product.title}
              fill
              unoptimized
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="font-semibold text-lg">{product.title}</h2>
            <p className="text-pink-600 font-bold mt-1">
              ₹{product.price}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="border rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-semibold">Order Summary</h3>

          <div className="flex justify-between">
            <span>Item price</span>
            <span>₹{product.price}</span>
          </div>

          <div className="flex justify-between text-gray-500">
            <span>Platform fee</span>
            <span>₹0</span>
          </div>

          <hr />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>₹{product.price}</span>
          </div>

          <button className="w-full mt-4 py-3 rounded-full bg-pink-600 text-white font-medium hover:bg-pink-700 transition">
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
