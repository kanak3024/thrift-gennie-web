"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PageTransition from "../components/PageTransition";
import { supabase } from "../../lib/supabase";
import { useWishlist } from "../hooks/useWishlist";

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useWishlist();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (wishlist.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, location, image_url, condition")
        .in("id", wishlist);

      if (!error && data) setProducts(data);
      setLoading(false);
    };

    fetchWishlistProducts();
  }, [wishlist]);

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F] px-6 py-28">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl mb-4" style={{ fontFamily: "var(--font-playfair)" }}>
            Reserved
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">
            The pieces you couldn't stop thinking about.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-[#EAE3DB] mb-4" />
                <div className="h-3 bg-[#EAE3DB] w-2/3 mb-2" />
                <div className="h-3 bg-[#EAE3DB] w-1/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-32 text-center border border-dashed border-black/10">
            <p className="text-sm italic opacity-40 mb-6">Your archive is empty for now.</p>
            <Link
              href="/buy"
              className="text-[10px] uppercase tracking-[0.3em] border border-black/20 px-8 py-3 hover:bg-black hover:text-white transition-all"
            >
              Browse the Archive
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            {products.map(product => (
              <div key={product.id} className="group relative">
                
                {/* Remove button */}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-sm"
                >
                  ✕
                </button>

                <Link href={`/product/${product.id}`}>
                  <div className="relative aspect-[3/4] bg-[#EAE3DB] overflow-hidden mb-4">
                    <Image
                      src={product.image_url || "/final.png"}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {product.condition && (
                      <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-widest bg-white/80 backdrop-blur-sm px-2 py-1">
                        {product.condition}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-start px-1">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-60 truncate mb-1">
                        {product.title}
                      </p>
                      {product.location && (
                        <p className="text-[9px] opacity-30 uppercase tracking-widest">
                          📍 {product.location}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-light">₹{product.price}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}