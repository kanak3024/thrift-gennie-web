export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EF] px-6 py-24 text-[#2B0A0F]">
      <div className="max-w-3xl mx-auto space-y-10">

        <h1 className="text-4xl tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>
          About Thrift Gennie
        </h1>

        <p className="text-sm uppercase tracking-[0.3em] text-[#B48A5A]">
          Thrift it. Love it. Gennie it.
        </p>

        <div className="space-y-6 text-[15px] leading-relaxed opacity-80">
          <p>
            Thrift Gennie is a platform built for the new generation of conscious consumers —
            where fashion is not just about trends, but about sustainability, individuality,
            and smart choices.
          </p>

          <p>
            We make it easy to <strong>buy, sell, and rent</strong> fashion pieces — giving clothes
            a longer life and reducing waste in the process.
          </p>

          <p>
            Whether you're looking to refresh your wardrobe, earn from your closet, or experiment
            with new styles without commitment — Thrift Gennie makes it seamless.
          </p>

          <p className="italic">
            Sustainability is not a trend. It’s the future.
          </p>
        </div>

      </div>
    </main>
  );
}