"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useWishlist } from "../hooks/useWishlist";

type Product = {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
};

export default function ProductCard({ product }: { product: Product }) {
  const { toggleWishlist, isWishlisted } = useWishlist();

  return (
    <div className="group relative rounded-2xl border bg-white overflow-hidden hover:shadow-xl transition">

      {/* ❤️ Animated Heart */}
      <motion.button
        whileTap={{ scale: 0.8 }}
        whileHover={{ scale: 1.2 }}
        onClick={() => toggleWishlist(product.id)}
        className="absolute top-4 right-4 z-20 text-xl"
      >
        {isWishlisted(product.id) ? "❤️" : "🤍"}
      </motion.button>

      <Link href={`/product/${product.id}`}>

        <div className="relative aspect-square bg-gray-100">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition"
          />
        </div>

        <div className="p-4 space-y-1">
          <h3 className="font-semibold truncate">
            {product.title}
          </h3>

          <p className="font-bold">
            ₹{product.price}
          </p>

          <p className="text-sm opacity-60">
            {product.location}
          </p>
        </div>

      </Link>
    </div>
  );
}
