import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, Menu, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@shared/commerce/types";

const fallbackImages = ["/manus-storage/soft-blue-ceramic-tray_3ec9b4b5.png", "/manus-storage/blush-pink-textured-throw_1209c01c.png"];

export function getProductFilters(products: Product[]) {
  return ["All pieces", ...Array.from(new Set(products.flatMap(product => [product.productType, ...product.tags].filter(Boolean) as string[])))];
}

export function filterProducts(products: Product[], filter: string) {
  return filter === "All pieces" ? products : products.filter(product => product.productType === filter || product.tags.includes(filter));
}

export function getSelectedVariant(product: Product, selectedVariantId?: string) {
  return product.variants.find(variant => variant.id === selectedVariantId) ?? product.variants[0];
}

function useFocusTrap(open: boolean, onClose: () => void, opener?: HTMLElement | null) {
  const ref = useRef<any>(null);
  const restoreTarget = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    restoreTarget.current = opener ?? (document.activeElement as HTMLElement);
    const root = ref.current as HTMLElement | null;
    if (!root) return;
    const focusable = (): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element): element is HTMLElement => !element.hasAttribute("disabled"));
    const first = focusable()[0];
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const current = document.activeElement;
      if (event.shiftKey && current === items[0]) { event.preventDefault(); items[items.length - 1]?.focus(); }
      else if (!event.shiftKey && current === items[items.length - 1]) { event.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); restoreTarget.current?.focus(); };
  }, [open, onClose, opener]);
  return ref;
}

function ProductCard({ product, index, onOpen }: { product: Product; index: number; onOpen: (product: Product) => void }) {
  const { addItem, loading } = useCart();
  const variant = product.variants[0];
  const image = product.images[0]?.url ?? fallbackImages[index % fallbackImages.length];
  return <article className="group product-card"><button className="product-image-wrap" onClick={() => onOpen(product)} aria-label={`View ${product.title}`}><img src={image} alt={product.images[0]?.altText ?? product.title} className="product-image" /><span className="product-hover-label">View piece <ArrowRight size={14} /></span></button><div className="flex items-start justify-between gap-4 pt-4"><div><p className="eyebrow text-muted-foreground">{product.productType || "Object"}</p><h3 className="mt-1 text-base font-semibold tracking-tight">{product.title}</h3></div><p className="pt-1 text-sm font-medium">{formatMoney(product.priceRange.min)}</p></div><Button className="mt-4 w-full rounded-full bg-black text-white hover:bg-black/80" disabled={!variant?.availableForSale || loading} onClick={() => variant && addItem(variant.id)}>{variant?.availableForSale ? "Add to bag" : "Sold out"}</Button></article>;
}

function CartDrawer({ opener }: { opener: HTMLElement | null }) {
  const { cart, isOpen, closeCart, updateQuantity, removeItem, proceedToCheckout, itemCount, loading } = useCart();
  const panelRef = useFocusTrap(isOpen, closeCart, opener);
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Shopping bag"><button aria-label="Close shopping bag" className="absolute inset-0 cursor-default" onClick={closeCart} /><aside ref={panelRef} className="relative flex h-full w-full max-w-md flex-col bg-[#f4f5f5] p-6 shadow-2xl sm:p-8"><div className="flex items-center justify-between border-b border-black/10 pb-5"><div><p className="eyebrow">Your edit</p><h2 className="mt-1 text-2xl font-semibold">Shopping bag <span className="text-sm font-normal text-black/50">({itemCount})</span></h2></div><button onClick={closeCart} aria-label="Close"><X /></button></div><div className="flex-1 overflow-y-auto py-6">{!cart?.items.length ? <div className="grid h-full place-items-center text-center"><div><ShoppingBag className="mx-auto mb-4 text-black/30" size={32} /><p className="font-medium">Your bag is waiting.</p><p className="mt-2 text-sm text-black/50">Add a considered piece to get started.</p></div></div> : <div className="space-y-5">{cart.items.map(item => <div className="flex gap-4" key={item.lineId}><div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-white">{item.image && <img src={item.image.url} alt={item.productTitle} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-medium">{item.productTitle}</p><p className="text-sm">{formatMoney(item.lineTotal)}</p></div>{item.variantTitle !== "Default Title" && <p className="mt-1 text-xs text-black/50">{item.variantTitle}</p>}<div className="mt-4 flex items-center justify-between"><div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-1"><button disabled={loading} onClick={() => updateQuantity(item.lineId, item.quantity - 1)} aria-label="Decrease quantity"><Minus size={13} /></button><span className="min-w-5 text-center text-xs">{item.quantity}</span><button disabled={loading} onClick={() => updateQuantity(item.lineId, item.quantity + 1)} aria-label="Increase quantity"><Plus size={13} /></button></div><button className="text-xs text-black/50 underline underline-offset-4" onClick={() => removeItem(item.lineId)}>Remove</button></div></div></div>)}</div>}</div><div className="border-t border-black/10 pt-5"><div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatMoney(cart?.subtotal ?? "0")}</span></div><p className="mt-2 text-xs leading-5 text-black/50">Shipping and taxes are calculated securely at Shopify checkout.</p><Button className="mt-5 h-12 w-full rounded-full bg-black text-white hover:bg-black/80" disabled={!itemCount || loading} onClick={proceedToCheckout}>Continue to checkout <ArrowRight className="ml-2" size={16} /></Button></div></aside></div>;
}

function ProductDetail({ product, onClose, opener }: { product: Product; onClose: () => void; opener: HTMLElement | null }) {
  const { addItem, loading } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]?.id);
  const panelRef = useFocusTrap(true, onClose, opener);
  const variant = getSelectedVariant(product, selectedVariant);
  const images = product.images.length ? product.images : [{ url: fallbackImages[0], altText: product.title }];
  return <div ref={panelRef} className="fixed inset-0 z-40 overflow-y-auto bg-[#eef0f0]" role="dialog" aria-modal="true" aria-label={`${product.title} details`}><div className="mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8"><div className="flex justify-end"><button onClick={onClose} aria-label="Close product details" className="rounded-full border border-black/10 bg-white p-3"><X size={18} /></button></div><div className="grid gap-10 pb-16 pt-5 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div><div className="aspect-square overflow-hidden rounded-[2rem] bg-white"><img src={images[activeImage]?.url} alt={images[activeImage]?.altText ?? product.title} className="h-full w-full object-cover" /></div>{images.length > 1 && <div className="mt-3 flex gap-3">{images.map((image, index) => <button key={image.url} onClick={() => setActiveImage(index)} className={`h-16 w-16 overflow-hidden rounded-xl ${activeImage === index ? "ring-2 ring-black" : "opacity-60"}`}><img src={image.url} alt="" className="h-full w-full object-cover" /></button>)}</div>}</div><div className="max-w-lg"><p className="eyebrow">{product.productType || "Manush Studio"}</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{product.title}</h1><p className="mt-5 text-xl">{formatMoney(product.priceRange.min)}</p><p className="mt-7 max-w-md text-base leading-7 text-black/60">{product.description}</p><div className="mt-8 flex flex-wrap gap-2">{product.variants.map(option => <button key={option.id} onClick={() => setSelectedVariant(option.id)} className={`rounded-full border px-4 py-2 text-sm ${selectedVariant === option.id ? "border-black bg-black text-white" : "border-black/10 bg-white"}`}>{option.title !== "Default Title" ? option.title : "Standard"}</button>)}</div><div className="mt-5 flex items-center gap-3 text-sm text-black/60"><span className="h-2 w-2 rounded-full bg-[#9bbbd2]" />{variant?.availableForSale ? "Ready to ship" : "Currently unavailable"}</div><Button className="mt-8 h-13 w-full rounded-full bg-black text-white hover:bg-black/80 sm:w-auto sm:min-w-64" disabled={!variant?.availableForSale || loading} onClick={() => variant && addItem(variant.id)}>Add to bag <ArrowRight className="ml-3" size={17} /></Button><div className="mt-10 border-t border-black/10 pt-6 text-sm text-black/60"><p>Thoughtfully made for slower, softer living.</p><p className="mt-2">Need help? Visit <a href="#support" className="underline underline-offset-4">order support</a>.</p></div></div></div></div></div>;
}

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeFilter, setActiveFilter] = useState("All pieces");
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartOpener = useRef<HTMLElement | null>(null);
  const productOpener = useRef<HTMLElement | null>(null);
  const listInput = useMemo(() => ({ first: 24 }), []);
  const { data: products = [], isLoading, isError } = trpc.commerce.products.list.useQuery(listInput);
  const { openCart, itemCount } = useCart();
  const filters = getProductFilters(products);
  const visibleProducts = filterProducts(products, activeFilter);
  return <><div className="min-h-screen overflow-hidden bg-[#eef0f0] text-[#111313]"><div className="border-b border-black/10 bg-[#dceaf2] px-5 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em]">Complimentary shipping on orders over $75</div><header className="container relative z-10 flex items-center justify-between py-6"><Link href="/" className="brand-mark">MANUSH<span>STUDIO</span></Link><nav className="hidden items-center gap-8 text-sm md:flex"><a href="#shop">Shop</a><a href="#story">Our approach</a><a href="#support">Support</a></nav><div className="flex items-center gap-3"><button className="rounded-full border border-black/10 bg-white p-2 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Open navigation"><Menu size={18} /></button><button onClick={startLogin} className="hidden text-sm md:block">Account</button><button onClick={() => { cartOpener.current = document.activeElement as HTMLElement; openCart(); }} className="relative rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium"><ShoppingBag size={16} className="mr-2 inline" /> Bag {itemCount > 0 && <span className="ml-1 text-black/50">{itemCount}</span>}</button></div></header>{mobileMenuOpen && <div className="container border-t border-black/10 py-4 md:hidden"><nav className="grid gap-3 text-sm"><a href="#shop" onClick={() => setMobileMenuOpen(false)}>Shop</a><a href="#story" onClick={() => setMobileMenuOpen(false)}>Our approach</a><a href="#support" onClick={() => setMobileMenuOpen(false)}>Support</a><button className="text-left" onClick={startLogin}>Account</button></nav></div>}<main><section className="container relative grid min-h-[610px] items-center gap-10 pb-20 pt-12 lg:grid-cols-[.9fr_1.1fr] lg:pb-28 lg:pt-20"><div className="relative z-10 max-w-xl"><p className="eyebrow">Objects for everyday rituals</p><h1 className="mt-6 text-[clamp(3.8rem,9vw,8.5rem)] font-semibold leading-[.88] tracking-[-0.075em]">Make room<br /><span className="text-[#8daec6]">for good.</span></h1><p className="mt-8 max-w-sm text-lg leading-7 text-black/60">A quiet collection of useful, beautiful things for a home that feels like yours.</p><a href="#shop" className="mt-9 inline-flex items-center rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">Explore the edit <ArrowRight className="ml-3" size={16} /></a></div><div className="hero-art"><div className="hero-circle" /><div className="hero-square" /><div className="hero-card"><span>01</span><p>Form<br />follows<br />feeling.</p></div><div className="hero-caption">A considered edit<br />for slower spaces.</div></div></section><section id="shop" className="container scroll-mt-8 pb-24"><div className="flex flex-col justify-between gap-5 border-t border-black/10 pt-8 sm:flex-row sm:items-end"><div><p className="eyebrow">The collection</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Small things,<br />well chosen.</h2></div><div className="relative"><button className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 text-sm" onClick={() => setFilterOpen(!filterOpen)}>Filter: {activeFilter} <ChevronDown size={15} /></button>{filterOpen && <div className="absolute right-0 top-12 z-20 w-48 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">{filters.map(filter => <button key={filter} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#eef0f0]" onClick={() => { setActiveFilter(filter); setFilterOpen(false); }}>{filter}</button>)}</div>}</div></div>{isLoading ? <div className="mt-10 grid gap-8 sm:grid-cols-2"><div className="skeleton h-96 rounded-[2rem]" /><div className="skeleton h-96 rounded-[2rem]" /></div> : isError ? <div className="mt-10 rounded-3xl bg-[#f5dfe1] p-8"><p className="font-semibold">The collection is taking a moment.</p><p className="mt-2 text-sm text-black/60">Please refresh shortly or visit support for help.</p></div> : visibleProducts.length ? <div className="mt-10 grid gap-x-6 gap-y-14 sm:grid-cols-2">{visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} onOpen={(item) => { productOpener.current = document.activeElement as HTMLElement; setSelectedProduct(item); }} />)}</div> : <div className="mt-10 rounded-3xl bg-white p-10 text-center"><p className="font-semibold">A quiet beginning.</p><p className="mt-2 text-sm text-black/50">New pieces are being prepared for this collection.</p></div>}</section><section id="story" className="relative overflow-hidden bg-[#f5dfe1] py-24"><div className="container grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-center"><div><p className="eyebrow">The Manush approach</p><h2 className="mt-5 text-4xl font-semibold leading-[.95] tracking-[-0.06em] sm:text-6xl">Less noise.<br />More meaning.</h2></div><div className="max-w-xl lg:pt-16"><p className="text-2xl leading-tight tracking-tight sm:text-3xl">We look for the pieces that earn their place. Tactile, useful, and quietly expressive.</p><p className="mt-7 max-w-md leading-7 text-black/60">Manush Studio is a growing collection of objects that bring softness to daily life. We choose shape, material, and function with care so you can do the same with your space.</p><a href="#support" className="mt-8 inline-flex items-center text-sm font-semibold underline underline-offset-8">Learn more <ArrowRight className="ml-3" size={16} /></a></div></div><div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[36px] border-white/40" /></section><section id="support" className="container grid gap-8 py-20 sm:grid-cols-3"><div><p className="eyebrow">Need a hand?</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Here when you need us.</h2></div><a href="mailto:hello@manush.studio" className="rounded-3xl bg-white p-6 transition-transform hover:-translate-y-1"><p className="eyebrow">Customer care</p><p className="mt-8 font-medium">hello@manush.studio <ArrowRight className="ml-2 inline" size={16} /></p></a><button onClick={startLogin} className="rounded-3xl bg-[#dceaf2] p-6 text-left transition-transform hover:-translate-y-1"><p className="eyebrow">Your orders</p><p className="mt-8 font-medium">Account & order support <ArrowRight className="ml-2 inline" size={16} /></p></button></section></main><footer className="container flex flex-col justify-between gap-4 border-t border-black/10 py-8 text-xs text-black/50 sm:flex-row"><p>© 2026 Manush Studio</p><div className="flex gap-5"><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#instagram">Instagram</a></div></footer></div><CartDrawer opener={cartOpener.current} />{selectedProduct && <ProductDetail product={selectedProduct} opener={productOpener.current} onClose={() => setSelectedProduct(null)} />}</>;
}
