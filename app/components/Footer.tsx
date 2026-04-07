export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-20">
      <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8 text-sm text-gray-600">
        
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Thrift Gennie</h3>
          <p>Buy. Sell. Rent. Sustainably.</p>
          <p className="mt-2">Made with 💖 in India</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Explore</h3>
          <ul className="space-y-1">
            <li>Buy</li>
            <li>Sell</li>
            <li>Rent</li>
            <li>My Orders</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Legal</h3>
          <ul className="space-y-1">
            <li>Privacy Policy</li>
            <li>Terms & Conditions</li>
            <li>Refund Policy</li>
          </ul>
        </div>

      </div>
    </footer>
  );
}
