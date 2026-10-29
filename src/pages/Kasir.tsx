import { useState, useEffect } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, X, PackagePlus } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { useJournal } from "../context/JournalContext";
import { useToast } from "../context/ToastContext";
import { useBahanBaku } from "../context/BahanBakuContext";
import { usePageTitle } from "../hooks/usePageTitle";
import ProductImage from "../components/ProductImage";
import ProductFormModal from "../components/ProductFormModal";
import { PRODUK_KOSONG } from "../components/produkForm";
import { rayakan } from "../utils/efek";
import Lapisan from "../components/Lapisan";

interface CartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  quantity: number;
  unitCost?: number;
}

interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "incoming" | "completed";
  createdAt: string;
}

export default function Kasir() {
  usePageTitle("Kasir POS");
  const { products, decrementStock, incrementStock, getById, addProduct } = useInventory();
  const { toast } = useToast();
  const { pakaiUntukPenjualan } = useBahanBaku();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [tambahOpen, setTambahOpen] = useState(0); // >0 = terbuka, nilainya jadi key form
  const [namaBaru, setNamaBaru] = useState("");
  const kategori = ["Semua", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchCategory =
      activeCategory === "Semua" || p.category === activeCategory;
    const matchSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const addToCart = (productId: string) => {
    const prod = getById(productId);
    if (!prod || prod.qty <= 0) return;
    // decrement stock - if not enough, abort
    const ok = decrementStock(productId, 1);
    if (!ok) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (existing) {
        return prev.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: prod.id,
          name: prod.name,
          price: prod.sellingPrice ?? prod.unitCost,
          category: prod.category,
          image: prod.image || "",
          quantity: 1,
          unitCost: prod.unitCost,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    if (delta > 0) {
      const ok = decrementStock(id, delta);
      if (!ok) return;
    } else if (delta < 0) {
      // jumlah di keranjang dikurangi: kembalikan stoknya
      const item = cart.find((c) => c.id === id);
      if (item) incrementStock(id, Math.min(item.quantity, -delta));
    }

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  // Mengosongkan keranjang sebelum dibayar mengembalikan stok
  const clearCart = () => {
    cart.forEach((item) => incrementStock(item.id, item.quantity));
    setCart([]);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.11; // 11% PPN
  const total = subtotal + tax;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { addSaleFromCart } = useJournal();

  // Orders panel state: incoming orders (set when payment is confirmed) and completed
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const raw = localStorage.getItem("kasir_orders");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [isOrdersPanelOpen, setIsOrdersPanelOpen] = useState(false);
  const [ordersTab, setOrdersTab] = useState<"incoming" | "completed">(
    "incoming",
  );

  useEffect(() => {
    try {
      localStorage.setItem("kasir_orders", JSON.stringify(orders));
    } catch (e) {
      // ignore
    }
  }, [orders]);

  const incomingCount = orders.filter((o) => o.status === "incoming").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const displayedOrders = orders.filter((o) => o.status === ordersTab);

  // Use the shipped QR image from public/ (qris.jpeg)
  const qrDataUrl = "/qris.jpeg";

  // Generate a printable receipt and open print dialog (user can Save as PDF)
  const generateReceiptAndPrint = () => {
    const now = new Date();
    const formattedDate = now.toLocaleString("id-ID");
    const rows = cart
      .map(
        (it) =>
          `<tr>
            <td style="padding:6px 8px">${it.name}</td>
            <td style="padding:6px 8px" align="right">${it.quantity} x</td>
            <td style="padding:6px 8px" align="right">${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(it.price)}</td>
            <td style="padding:6px 8px" align="right">${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(it.price * it.quantity)}</td>
          </tr>`,
      )
      .join("");

    const subtotalHtml = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(subtotal);
    const taxHtml = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(tax);
    const totalHtml = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(total);

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Struk Pembayaran</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111 }
            .logo { text-align:center; margin-bottom:8px }
            table { width:100%; border-collapse: collapse; margin-top:8px }
            td { border-bottom: 1px solid #eee }
            .totals td { border: none; }
          </style>
        </head>
        <body>
          <div class="logo">
            <h2>Struk Pembayaran</h2>
            <div style="font-size:12px;color:#666">${formattedDate}</div>
          </div>
          <table>
            ${rows}
          </table>
          <table style="margin-top:12px" class="totals">
            <tr><td>Subtotal</td><td style="text-align:right">${subtotalHtml}</td></tr>
            <tr><td>PPN (11%)</td><td style="text-align:right">${taxHtml}</td></tr>
            <tr><td style="font-weight:700">Total</td><td style="text-align:right;font-weight:700">${totalHtml}</td></tr>
          </table>
          <div style="margin-top:18px;font-size:12px;color:#666;text-align:center">Terima kasih telah berbelanja</div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) {
      alert("Perbolehkan popup untuk mencetak struk.");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
  };

  const createOrderFromCart = (cartItems: CartItem[]): Order => {
    const orderSubtotal = cartItems.reduce(
      (s, it) => s + it.price * it.quantity,
      0,
    );
    const orderTax = orderSubtotal * 0.11;
    const orderTotal = orderSubtotal + orderTax;
    return {
      id: `ORD-${Date.now()}`,
      items: cartItems.map((c) => ({ ...c })),
      subtotal: orderSubtotal,
      tax: orderTax,
      total: orderTotal,
      status: "incoming",
      createdAt: new Date().toISOString(),
    };
  };

  const markOrderCompleted = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "completed" } : o)),
    );
  };

  const printOrder = (order: Order) => {
    const rows = order.items
      .map(
        (it) =>
          `<tr>
            <td style="padding:6px 8px">${it.name}</td>
            <td style="padding:6px 8px" align="right">${it.quantity} x</td>
            <td style="padding:6px 8px" align="right">${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(it.price)}</td>
            <td style="padding:6px 8px" align="right">${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(it.price * it.quantity)}</td>
          </tr>`,
      )
      .join("");

    const subtotalHtml = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(order.subtotal);
    const taxHtml = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(order.tax);
    const totalHtml = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(order.total);

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Struk Pembayaran</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111 }
            .logo { text-align:center; margin-bottom:8px }
            table { width:100%; border-collapse: collapse; margin-top:8px }
            td { border-bottom: 1px solid #eee }
            .totals td { border: none; }
          </style>
        </head>
        <body>
          <div class="logo">
            <h2>Struk Pembayaran</h2>
            <div style="font-size:12px;color:#666">${new Date(order.createdAt).toLocaleString("id-ID")}</div>
          </div>
          <table>
            ${rows}
          </table>
          <table style="margin-top:12px" class="totals">
            <tr><td>Subtotal</td><td style="text-align:right">${subtotalHtml}</td></tr>
            <tr><td>PPN (11%)</td><td style="text-align:right">${taxHtml}</td></tr>
            <tr><td style="font-weight:700">Total</td><td style="text-align:right;font-weight:700">${totalHtml}</td></tr>
          </table>
          <div style="margin-top:18px;font-size:12px;color:#666;text-align:center">Terima kasih telah berbelanja</div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) {
      alert("Perbolehkan popup untuk mencetak struk.");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
  };

  return (
    <>
      <div className="card-elegant flex flex-col md:flex-row h-[calc(100vh-9.5rem)] min-h-[560px] bg-gray-50 overflow-hidden">
        {/* Left Area: Products */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Bar: Search & Categories */}
          <div className="bg-white p-4 border-b z-10">
            <div className="flex flex-wrap items-center gap-3 w-full">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-primary" />
                Kasir / POS
              </h1>
              <div className="flex-1 min-w-[180px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
                <button
                  onClick={() => {
                    setIsOrdersPanelOpen(true);
                    setOrdersTab("incoming");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white"
                >
                  Pesanan Masuk
                  <span className={`rounded-full px-1.5 text-[11px] ${incomingCount ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>{incomingCount}</span>
                </button>
                <button
                  onClick={() => {
                    setIsOrdersPanelOpen(true);
                    setOrdersTab("completed");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white"
                >
                  Sudah Selesai
                  <span className="rounded-full bg-gray-200 px-1.5 text-[11px] text-gray-600">{completedCount}</span>
                </button>
              </div>
              <button
                onClick={() => {
                  setNamaBaru("");
                  setTambahOpen((n) => n + 1);
                }}
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                <PackagePlus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah Produk</span>
              </button>
            </div>
          </div>
          {kategori.length > 2 && (
            <div className="bg-white px-4 py-2 border-b flex gap-2 overflow-x-auto">
              {kategori.map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveCategory(k)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    activeCategory === k ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    if (product.qty <= 0) toast(`Stok ${product.name} habis`, "peringatan");
                    addToCart(product.id);
                  }}
                  className={`card-elegant hover-lift overflow-hidden cursor-pointer active:scale-95 ${product.qty <= 0 ? "opacity-50" : ""}`}
                >
                  <div className="aspect-square bg-gray-100 relative">
                    <ProductImage
                      src={product.image}
                      name={product.name}
                      className="w-full h-full"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-md text-xs font-semibold text-primary backdrop-blur-sm shadow-sm">
                      {product.category}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-800 text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    <p className="text-primary font-bold mt-1 text-sm">
                      {formatRupiah(product.sellingPrice ?? product.unitCost)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Stok: {product.qty}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                <Search className="w-12 h-12 text-gray-300" />
                <p>Produk tidak ditemukan</p>
                {searchQuery.trim() && (
                  <button
                    onClick={() => {
                      setNamaBaru(searchQuery.trim());
                      setTambahOpen((n) => n + 1);
                    }}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                  >
                    <PackagePlus className="w-4 h-4" /> Tambah "{searchQuery.trim()}" sebagai produk baru
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Order Summary / Cart (desktop) */}
        <div className="hidden md:flex w-96 bg-white md:border-l border-t md:border-t-0 shadow-xl flex-col h-full z-20">
          <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              Detail Pesanan
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} item
              </span>
            </h2>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Kosongkan keranjang"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                <ShoppingCart className="w-16 h-16 text-gray-200" />
                <p className="text-sm">Keranjang masih kosong</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-3 bg-white">
                  <ProductImage
                    src={item.image}
                    name={item.name}
                    className="w-16 h-16 rounded-lg border shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800 text-sm leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatRupiah(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg border p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-white rounded-md text-gray-600 shadow-sm"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-semibold w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-white rounded-md text-gray-600 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {formatRupiah(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50/50 border-t flex flex-col gap-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>PPN (11%)</span>
                <span>{formatRupiah(tax)}</span>
              </div>
              <div className="pt-2 border-t border-dashed flex justify-between items-end">
                <span className="font-semibold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>
            <button
              disabled={cart.length === 0}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl mt-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              onClick={() => setIsPaymentOpen(true)}
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* Mobile cart control: show pill summary when items exist, otherwise small floating button */}
      {cart.length > 0 ? (
        <button
          aria-label="Buka detail pesanan"
          onClick={() => setIsCartOpen(true)}
          className="md:hidden fixed left-4 right-4 bottom-6 z-50 bg-primary text-white rounded-full px-4 py-3 flex items-center justify-between shadow-2xl"
        >
          <div className="flex flex-col text-left">
            <span className="font-semibold text-lg">
              {cart.reduce((s, it) => s + it.quantity, 0)} item
            </span>
            <span className="text-sm opacity-90">Ringkasan pesanan</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-lg font-bold">{formatRupiah(total)}</div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
        </button>
      ) : (
        <button
          aria-label="Buka detail pesanan"
          onClick={() => setIsCartOpen(true)}
          className="md:hidden fixed bottom-6 right-4 z-50 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl ring-2 ring-primary/20"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </button>
      )}

      {/* Mobile slide-over cart */}
      {isCartOpen && (
        <Lapisan className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-xs bg-white shadow-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Detail Pesanan</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => clearCart()}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-3">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <ShoppingCart className="w-16 h-16 text-gray-200" />
                  <p className="text-sm">Keranjang masih kosong</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-3 bg-white">
                    <ProductImage
                      src={item.image}
                      name={item.name}
                      className="w-16 h-16 rounded-lg border shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800 text-sm leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatRupiah(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg border p-0.5">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-white rounded-md text-gray-600 shadow-sm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-semibold w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-white rounded-md text-gray-600 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {formatRupiah(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>PPN (11%)</span>
                <span>{formatRupiah(tax)}</span>
              </div>
              <div className="pt-2 border-t border-dashed flex justify-between items-end">
                <span className="font-semibold text-gray-800">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatRupiah(total)}
                </span>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => {
                  setIsPaymentOpen(true);
                  setIsCartOpen(false);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl mt-3 transition-colors disabled:opacity-50"
              >
                Bayar Sekarang
              </button>
            </div>
          </div>
        </Lapisan>
      )}

      {isPaymentOpen && (
        <Lapisan className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Pembayaran</h3>

            <div className="flex flex-col items-center gap-3 mb-4">
              <img
                src={qrDataUrl}
                alt="QRIS"
                className="w-1/2  h-1/2 bg-white border rounded-md"
              />

              <div className="text-center">
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatRupiah(total)}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Scan QRIS di atas untuk melakukan pembayaran
              </p>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-semibold"
                onClick={() => {
                  // finalize payment: record sale in journals, then add to orders and clear cart
                  try {
                    addSaleFromCart(cart, {
                      description: "Penjualan via Kasir",
                      tax: Math.round(tax),
                    });
                  } catch (e) {
                    console.error(e);
                  }

                  // bahan baku berkurang sesuai resep tiap produk
                  const menipis = pakaiUntukPenjualan(cart.map((c) => ({ name: c.name, quantity: c.quantity })));
                  if (menipis.length > 0) {
                    toast(`Bahan hampir habis: ${menipis.map((b) => b.nama).join(", ")}. Cek tab Persediaan.`, "peringatan");
                  }

                  if (cart.length > 0) {
                    const order = createOrderFromCart(cart);
                    setOrders((prev) => [order, ...prev]);
                  }

                  // stok sudah berkurang saat barang masuk keranjang
                  setCart([]);
                  setIsPaymentOpen(false);
                  toast("Pembayaran tercatat dan jurnal penjualan dibuat");
                  rayakan();
                }}
              >
                Saya sudah bayar
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200"
                onClick={() => generateReceiptAndPrint()}
              >
                Cetak Struk
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200"
                onClick={() => setIsPaymentOpen(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </Lapisan>
      )}

      {isOrdersPanelOpen && (
        <Lapisan className="fixed inset-0 z-[80]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOrdersPanelOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setOrdersTab("incoming")}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${ordersTab === "incoming" ? "bg-primary text-white" : "bg-gray-100"}`}
                >
                  Masuk ({incomingCount})
                </button>
                <button
                  onClick={() => setOrdersTab("completed")}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${ordersTab === "completed" ? "bg-primary text-white" : "bg-gray-100"}`}
                >
                  Selesai ({completedCount})
                </button>
              </div>
              <button
                onClick={() => setIsOrdersPanelOpen(false)}
                className="p-2 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {displayedOrders.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  Tidak ada pesanan
                </div>
              ) : (
                displayedOrders.map((order) => (
                  <div key={order.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">
                        Pesanan {order.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                      {order.items.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <div>
                            {it.quantity} x {it.name}
                          </div>
                          <div>{formatRupiah(it.price * it.quantity)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm font-semibold">Total</div>
                      <div className="text-sm font-bold">
                        {formatRupiah(order.total)}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {order.status === "incoming" && (
                        <button
                          onClick={() => markOrderCompleted(order.id)}
                          className="px-3 py-1 rounded-lg bg-primary text-white text-sm"
                        >
                          Selesai
                        </button>
                      )}
                      <button
                        onClick={() => printOrder(order)}
                        className="px-3 py-1 rounded-lg border text-sm"
                      >
                        Cetak
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Lapisan>
      )}
      <ProductFormModal
        key={tambahOpen}
        open={tambahOpen > 0}
        title="Tambah Produk"
        initial={{ ...PRODUK_KOSONG, name: namaBaru, category: products[0]?.category ?? "" }}
        submitLabel="Simpan Produk"
        onClose={() => {
          setTambahOpen(0);
          setNamaBaru("");
        }}
        onSubmit={(p) => {
          addProduct(p);
          setTambahOpen(0);
          setNamaBaru("");
          setSearchQuery("");
          toast(`${p.name} ditambahkan ke daftar produk`);
        }}
      />
    </>
  );
}
