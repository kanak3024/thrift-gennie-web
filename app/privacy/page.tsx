export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EF] px-6 py-24 text-[#2B0A0F]">
      <div className="max-w-3xl mx-auto space-y-10">

        <h1 className="text-4xl tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>
          Privacy Policy
        </h1>

        <div className="space-y-6 text-[15px] leading-relaxed opacity-80">

          <p>
            We respect your privacy and are committed to protecting your personal data.
          </p>

          <p>
            Your information is used only to provide and improve our services, including transactions,
            communication, and personalization.
          </p>

          <p>
            We do not sell or share your personal data with third parties without your consent.
          </p>

          <p>
            By using Thrift Gennie, you agree to this privacy policy.
          </p>

        </div>

      </div>
    </main>
  );
}