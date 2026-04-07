export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EF] px-6 py-24 text-[#2B0A0F]">
      <div className="max-w-3xl mx-auto space-y-10">

        <h1 className="text-4xl tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>
          Terms & Conditions
        </h1>

        <div className="space-y-6 text-[15px] leading-relaxed opacity-80">

          <p>
            By using Thrift Gennie, you agree to use the platform responsibly and ethically.
          </p>

          <p>
            Users are responsible for the accuracy of their listings, pricing, and communication.
          </p>

          <p>
            Thrift Gennie acts as a platform connecting buyers and sellers and is not liable
            for disputes between users.
          </p>

          <p>
            We reserve the right to remove listings or suspend accounts that violate platform policies.
          </p>

        </div>

      </div>
    </main>
  );
}