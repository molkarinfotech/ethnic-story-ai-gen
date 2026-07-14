-- Ethnic Story — Chatbot Knowledge Base Seed
-- Run this in your Supabase SQL editor after creating the chatbot_kb table.
-- Table: chatbot_kb (id uuid, topic text, content text, tags text, created_at, updated_at)

INSERT INTO chatbot_kb (topic, content, tags) VALUES

-- ───────────────────────────────────────────
-- SHIPPING
-- ───────────────────────────────────────────
(
  'Shipping destinations',
  'Ethnic Story ships worldwide. We deliver to Australia, the United Kingdom, the United States, Canada, New Zealand, and the Middle East. If your country is not listed at checkout, please contact us and we will do our best to arrange delivery.',
  'shipping, delivery, international'
),
(
  'Shipping timeframes',
  'Standard delivery within Australia takes 3–7 business days. International orders to the UK, USA, and Canada typically arrive within 7–14 business days. Express shipping options are available at checkout for faster delivery. Please note that customs processing may add extra time for international orders.',
  'shipping, delivery, timeframe, express'
),
(
  'Shipping costs',
  'Free standard shipping is available on Australian orders over $150 AUD. For orders under $150 AUD, a flat shipping fee applies and is shown at checkout. International shipping rates are calculated at checkout based on your location and order weight.',
  'shipping, cost, free shipping, fee'
),
(
  'Order tracking',
  'Once your order is dispatched, you will receive a shipping confirmation email with a tracking number. You can use this tracking number on our carrier''s website to monitor your delivery in real time. If you haven''t received a tracking email within 2 business days of placing your order, please check your spam folder or contact us.',
  'tracking, order, shipping, dispatch'
),
(
  'Customs and duties',
  'International orders may be subject to customs duties, taxes, or import fees charged by your country''s customs authority. These charges are the responsibility of the buyer and are not included in our prices or shipping fees. We recommend checking your local customs regulations before ordering.',
  'customs, duties, taxes, international'
),

-- ───────────────────────────────────────────
-- RETURNS & EXCHANGES
-- ───────────────────────────────────────────
(
  'Return policy',
  'We accept returns within 14 days of delivery for items that are unworn, unwashed, and in their original condition with all tags attached. Sale items and custom-tailored pieces are final sale and cannot be returned. To initiate a return, please contact us at support@ethnicstory.com.au with your order number and reason for return.',
  'returns, refund, policy'
),
(
  'Exchange process',
  'We offer exchanges for a different size or colour within 14 days of delivery, subject to stock availability. To request an exchange, contact us with your order number and the item you would like instead. Return shipping for exchanges is at the customer''s expense unless the item was faulty or incorrectly sent.',
  'exchange, size, colour, swap'
),
(
  'Refund timeframe',
  'Once we receive and inspect your returned item, refunds are processed within 5–7 business days. The refund will be credited back to your original payment method. You will receive an email confirmation once your refund has been processed. Please allow additional time for your bank to reflect the amount.',
  'refund, money back, timeline'
),
(
  'Faulty or incorrect items',
  'If you receive a faulty, damaged, or incorrect item, please contact us within 48 hours of delivery with photos of the issue. We will arrange a free return and send a replacement or issue a full refund at no cost to you. We take quality very seriously and apologise for any inconvenience.',
  'faulty, damaged, wrong item, defect'
),

-- ───────────────────────────────────────────
-- SIZING & FIT
-- ───────────────────────────────────────────
(
  'Sizing guide',
  'Our sizing follows standard Indian ethnic wear sizing: XS, S, M, L, XL, XXL. Each product page includes a detailed size chart with chest, waist, and hip measurements in both centimetres and inches. We recommend measuring yourself and comparing to the size chart before ordering, as sizing can vary between styles.',
  'sizing, size chart, measurements, fit'
),
(
  'Saree sizing and draping',
  'Our sarees are standard length (5.5 metres including blouse piece) unless stated otherwise in the product description. Sarees are one-size and fit all body types depending on how they are draped. Each saree listing specifies the blouse piece dimensions. If you need a custom blouse size, please contact us before ordering.',
  'saree, sizing, draping, blouse, length'
),
(
  'Lehenga sizing',
  'Lehengas come in standard sizes XS–XXL. The lehenga skirt has a drawstring or hook waistband that allows some adjustability. The choli (blouse) and dupatta are included. If you are between sizes, we recommend sizing up for comfort, especially in the choli. Custom sizing is available — please contact us for details.',
  'lehenga, sizing, choli, dupatta, fit'
),
(
  'Kurta and kurta set sizing',
  'Kurtas and kurta sets follow standard sizes S–XXL. The size chart on each product page shows chest and length measurements. Kurta lengths are listed in the product description and range from hip-length to floor-length depending on the style. Palazzo pants typically have an elasticated or drawstring waist.',
  'kurta, sizing, palazzo, fit'
),
(
  'Custom tailoring',
  'We offer custom tailoring on selected products. If you need a custom size, please contact us before placing your order with your measurements (bust, waist, hip, height, and shoulder width). Custom orders typically take 10–15 additional business days to produce and are final sale.',
  'custom, tailoring, measurements, made to order'
),

-- ───────────────────────────────────────────
-- PRODUCTS & COLLECTIONS
-- ───────────────────────────────────────────
(
  'Product categories',
  'Ethnic Story carries a curated range of Indian ethnic wear including sarees, lehengas, kurta sets, salwar kameez, anarkali suits, Indo-western fusion pieces, and festive accessories. Our collections are updated seasonally with new arrivals for weddings, festivals, and everyday occasions.',
  'products, collections, categories, range'
),
(
  'Fabric and materials',
  'We source fabrics directly from artisan weavers across India. Our range includes Banarasi silk, Chanderi cotton-silk, Kanjivaram silk, georgette, chiffon, organza, and handloom cotton. Fabric details are listed on each product page. If you have questions about a specific fabric, please contact us.',
  'fabric, material, silk, cotton, handloom, banarasi'
),
(
  'Care instructions',
  'Most of our garments recommend dry clean only, especially silk and heavily embroidered pieces. Some cotton and georgette items can be hand washed in cold water with a gentle detergent. Care instructions specific to each garment are listed on the product page and on the care label inside the garment. Avoid tumble drying or wringing ethnic wear.',
  'care, washing, dry clean, maintenance'
),
(
  'New arrivals and restocks',
  'New collections drop seasonally — typically before major Indian festivals such as Navratri, Diwali, Eid, and wedding season. You can sign up for our newsletter to be the first to know about new arrivals and limited drops. You can also use the "Notify me" feature on sold-out product pages to get an alert when an item is restocked.',
  'new arrivals, restock, notify, newsletter'
),
(
  'Product authenticity',
  'All products sold on Ethnic Story are sourced directly from verified artisans and manufacturers in India. We do not sell replicas or mass-produced fast fashion. Each piece is quality-checked before dispatch. We are committed to supporting Indian craft traditions and ethical sourcing.',
  'authentic, handmade, quality, artisan, India'
),

-- ───────────────────────────────────────────
-- ORDERS & PAYMENTS
-- ───────────────────────────────────────────
(
  'Payment methods accepted',
  'We accept all major credit and debit cards (Visa, Mastercard, American Express), as well as Afterpay for buy-now-pay-later on eligible Australian orders, and Apple Pay and Google Pay at checkout. All payments are processed securely through Stripe.',
  'payment, credit card, afterpay, apple pay, stripe'
),
(
  'Afterpay eligibility',
  'Afterpay is available for Australian customers on orders between $35 AUD and $2,000 AUD. At checkout, select Afterpay as your payment method and you will be redirected to complete the Afterpay agreement. You pay in 4 fortnightly instalments with no interest.',
  'afterpay, buy now pay later, instalments, australia'
),
(
  'Modifying or cancelling an order',
  'Orders can be modified or cancelled within 1 hour of being placed, provided they have not yet been dispatched. Please contact us immediately at support@ethnicstory.com.au with your order number if you need to make changes. Once an order has been dispatched, it cannot be cancelled but may be eligible for return.',
  'cancel, modify, change order'
),
(
  'Order confirmation',
  'After placing an order you will receive an order confirmation email within a few minutes. If you do not receive it, please check your spam or junk folder. If it is not there either, contact us with your name and email address and we will resend it.',
  'order confirmation, email, receipt'
),
(
  'Promo codes and discounts',
  'You can apply a promo or discount code at checkout in the designated field before completing your purchase. Only one code can be applied per order. If your code is not working, check that it has not expired, that the items in your cart are eligible, and that you have met any minimum order requirements.',
  'promo code, discount, coupon, voucher'
),

-- ───────────────────────────────────────────
-- ACCOUNT & LOYALTY
-- ───────────────────────────────────────────
(
  'Creating an account',
  'You can shop as a guest or create an account for a faster checkout experience. Creating an account also lets you track your orders, save your addresses, view your order history, and earn loyalty reward points. Sign up using your email address on the account page.',
  'account, sign up, register, login'
),
(
  'Loyalty rewards program',
  'Ethnic Story has a loyalty rewards program. You earn points for every purchase, and points can be redeemed for discounts on future orders. You may also earn bonus points for writing reviews, referring friends, and following us on social media. Log in to your account to check your current points balance.',
  'loyalty, rewards, points, discount'
),
(
  'Forgot password',
  'If you have forgotten your password, click "Forgot password" on the login page and enter your email address. You will receive a password reset link within a few minutes. Check your spam folder if it does not arrive. If you continue to have trouble, contact us for assistance.',
  'password, forgot, reset, login'
),

-- ───────────────────────────────────────────
-- CONTACT & SUPPORT
-- ───────────────────────────────────────────
(
  'How to contact us',
  'You can reach the Ethnic Story team by email at support@ethnicstory.com.au. We aim to respond to all enquiries within 1 business day. For urgent matters, you can also use the live chat on our website during business hours (Monday–Friday, 9am–5pm AEST).',
  'contact, support, email, help'
),
(
  'Business hours',
  'Our customer support team is available Monday to Friday, 9am to 5pm AEST (Australian Eastern Standard Time). Orders placed on weekends or public holidays will be processed the next business day. Our website and chatbot are available 24/7 for browsing, ordering, and general queries.',
  'hours, business hours, support, availability'
),
(
  'Wholesale and bulk orders',
  'We welcome wholesale and bulk order enquiries from boutiques, event planners, and stylists. Please contact us at support@ethnicstory.com.au with details about the items you are interested in, quantities required, and your business details. We will respond with pricing and availability.',
  'wholesale, bulk, trade, boutique'
),
(
  'Styling advice',
  'Our team loves helping customers find the perfect outfit. If you need styling advice for a specific occasion — such as a wedding, mehndi, sangeet, or festival — feel free to reach out via email or live chat. You can also book a virtual styling session through our website for a personalised consultation.',
  'styling, advice, outfit, occasion, wedding, festival'
);
