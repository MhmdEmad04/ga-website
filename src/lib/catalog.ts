export const colors = [
  { id: "black", name: "أسود", hex: "#292725" },
  { id: "beige", name: "بيج", hex: "#ddd0bb" },
  { id: "camel", name: "جملي", hex: "#ac7850" },
] as const;

export type ColorId = (typeof colors)[number]["id"];
export const categories = ["الكل", "شنط يد", "كروس بودي", "شنط كتف", "كلاتش"] as const;
export type Category = string;
export type CartLine = { productId: string; color: ColorId; quantity: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  features: string[];
  category: Exclude<Category, "الكل">;
  price: number;
  images: Record<ColorId, string>;
  defaultColor: ColorId;
  stock: Record<ColorId, number>;
};

function variantImages(): Record<ColorId, string> {
  // Shared temporary photos approved by the owner; replace per product at launch.
  return { black: "/images/products/variants/laila-black.png", beige: "/images/products/variants/laila-beige.png", camel: "/images/products/variants/laila-camel.png" };
}

// Preview catalog: original editorial copy and AI-generated color mockups.
// Materials and measurements need confirmation before sale.
export const products: Product[] = [
  { id: "01", slug: "laila", name: "ليلى", subtitle: "شنطة يد بتفاصيل كلاسيكية", description: "ليلى بتجمع الخطوط الواضحة مع نقشة بارزة ولمسة ذهبية في القفل. تصميمها المتماسك ومقبضها العلوي بيديها حضور هادي، يناسب إطلالة الشغل أو خروجة مرتّبة. نسّقيها مع ألوان محايدة، أو خليها اللمسة اللي تربط تفاصيل لبسك ببعض.", features: ["تصميم هندسي بغطاء أمامي", "مقبض علوي ونقشة بارزة", "قفل ذهبي يكمل الطابع الكلاسيكي"], category: "شنط يد", price: 590, images: variantImages(), defaultColor: "beige", stock: { black: 30, beige: 30, camel: 30 } },
  { id: "02", slug: "nour", name: "نور", subtitle: "كروس بودي بخطوط بسيطة", description: "نور اختيارك لما تحبي إطلالة بسيطة من غير تفاصيل كتير. الغطاء الأمامي المائل والقفل الدائري بيدّوا التصميم شخصية مختلفة، مع شكل مستطيل سهل التنسيق. تليق على الجينز والقميص، وتكمّل مشاوير يومك بطابع هادي.", features: ["شكل مستطيل بغطاء مائل", "قفل دائري صغير", "تصميم كروس بودي بطابع يومي"], category: "كروس بودي", price: 550, images: variantImages(), defaultColor: "camel", stock: { black: 30, beige: 30, camel: 30 } },
  { id: "03", slug: "dalia", name: "داليا", subtitle: "كلاتش بإبزيم مميز", description: "تفصيلة واحدة كفاية تسيب انطباع. داليا بتصميمها المستطيل وإبزيمها العريض من نفس اللون بتضيف لمسة واضحة لإطلالتك. اختاريها مع فستان بسيط أو طقم مسائي، وسيبي خطوطها النظيفة تتكلم عن ذوقك.", features: ["تصميم كلاتش مستطيل", "إبزيم عريض من نفس اللون", "طابع بسيط مناسب للخروجات"], category: "كلاتش", price: 500, images: variantImages(), defaultColor: "camel", stock: { black: 30, beige: 30, camel: 30 } },
  { id: "04", slug: "salma", name: "سلمى", subtitle: "شنطة كتف بلمسة دافئة", description: "سلمى فيها دفء القطع الكلاسيكية اللي بنرجعلها كل مرة. غطاؤها المستدير وتفاصيل القفل الذهبية بيكسروا حدة الشكل، ويخلّوها سهلة التنسيق مع الفساتين والملابس اليومية. قطعة هادية تكمّل إطلالتك من الصبح للمساء.", features: ["غطاء أمامي بحواف مستديرة", "تفصيلة قفل ذهبية", "حزام كتف يكمل التصميم"], category: "شنط كتف", price: 580, images: variantImages(), defaultColor: "camel", stock: { black: 30, beige: 30, camel: 30 } },
  { id: "05", slug: "hana", name: "هنا", subtitle: "شنطة هلالية بروح عصرية", description: "هنا بخطوط منحنية وشكل هلالي هادي، للّحظات اللي تحبي فيها اختيار بسيط ومختلف. المقبض العريض جزء من جمال التصميم، والتفاصيل القليلة بتخليها تليق على أكتر من ستايل. نسّقيها مع قميص واسع أو فستانك اليومي المفضل.", features: ["شكل هلالي بانحناءات ناعمة", "مقبض علوي عريض", "تفاصيل قليلة بطابع عصري"], category: "شنط يد", price: 560, images: variantImages(), defaultColor: "beige", stock: { black: 30, beige: 30, camel: 30 } },
  { id: "06", slug: "farida", name: "فريدة", subtitle: "شنطة كتف بروح ڤينتج", description: "فريدة مستوحاة من بساطة الشنط الكلاسيكية: شكل مستطيل، حواف ناعمة، وقفل صغير في المنتصف. حضورها الهادي يليق على درجات البيج والبني، أو يضيف دفء لإطلالة سوداء. اختيار لمحبات التفاصيل اللي جمالها بيفضل مع الوقت.", features: ["تصميم مستطيل بحواف ناعمة", "قفل أمامي صغير", "حزام كتف وطابع كلاسيكي"], category: "شنط كتف", price: 600, images: variantImages(), defaultColor: "camel", stock: { black: 30, beige: 30, camel: 30 } },
  { id: "07", slug: "joud", name: "جود", subtitle: "ميني باج بحضور مميز", description: "جود شنطة صغيرة في شكلها، مميزة في حضورها. النقشة البارزة والمقبض القصير والقفل الهندسي بيضيفوا شخصية لإطلالة بسيطة. تليق على خروجة خفيفة أو مناسبة تحبي فيها تكون الشنطة جزء واضح من التنسيق.", features: ["تصميم ميني بغطاء أمامي", "مقبض قصير ونقشة بارزة", "قفل هندسي لافت"], category: "كروس بودي", price: 520, images: variantImages(), defaultColor: "black", stock: { black: 30, beige: 30, camel: 30 } },
  { id: "08", slug: "ward", name: "ورد", subtitle: "شنطة يد بمقابض دائرية", description: "ورد بتفاصيلها الناعمة ومقابضها الدائرية بتدي إحساس بسيط ومريح للإطلالة. شكلها المتوازن وخطوطها الواضحة يخلوها اختيار سهل مع لبس الشغل أو خروجة آخر الأسبوع. اختاري لونها حسب مزاجك، وكمّلي بيها حكاية يومك.", features: ["مقبضان دائريان", "شكل متوازن بحواف منحنية", "واجهة بسيطة بدون زحمة تفاصيل"], category: "شنط يد", price: 570, images: variantImages(), defaultColor: "camel", stock: { black: 30, beige: 30, camel: 30 } },
];

export const priceFormat = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 });
export const money = (amount: number) => `${priceFormat.format(amount)} ج.م`;
export const getProduct = (id: string) => products.find((product) => product.id === id);
export const buyNowHref = (productId: string, color: ColorId, quantity = 1) => `/checkout?product=${encodeURIComponent(productId)}&color=${color}&quantity=${quantity}`;

export const governorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", "أسوان", "أسيوط", "بني سويف", "بورسعيد", "دمياط", "الشرقية", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "سوهاج",
] as const;

export function shippingFor(governorate: string): number | null {
  if (!governorates.some((name) => name === governorate)) return null;
  return governorate === "القاهرة" || governorate === "الجيزة" ? 80 : 120;
}
