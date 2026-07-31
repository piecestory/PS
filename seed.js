/**
 * تعبئة أولية لقاعدة البيانات — نفس منتجات ومزادات الموقع الحالية
 * تمامًا (منقولة من frontend/js/data.js الأصلي) مع إضافة الترجمة
 * الإنجليزية وحساب مدير تجريبي للتجربة المحلية.
 * التشغيل: node seed.js  (أو npm run seed)
 */
const { newId } = require('./src/utils/ids');
const { toHalalas } = require('./src/utils/money');
const { hashPassword } = require('./src/utils/password');
const { toDbDateTime } = require('./src/utils/dates');
const { initDb } = require('./src/db/connection');
const logger = require('./src/utils/logger');

const CATEGORIES = [
  { slug: 'vases', nameAr: 'مزهريات وخزفيات', nameEn: 'Vases & Ceramics', icon: 'vase' },
  { slug: 'lighting', nameAr: 'إضاءة أثرية', nameEn: 'Antique Lighting', icon: 'chandelier' },
  { slug: 'mirrors', nameAr: 'مرايا مؤطرة', nameEn: 'Framed Mirrors', icon: 'mirror' },
  { slug: 'clocks', nameAr: 'ساعات', nameEn: 'Clocks', icon: 'clock' },
  { slug: 'sculptures', nameAr: 'منحوتات', nameEn: 'Sculptures & Statues', icon: 'statue' },
  { slug: 'boxes', nameAr: 'صناديق', nameEn: 'Boxes & Chests', icon: 'chest' },
  { slug: 'paintings', nameAr: 'لوحات', nameEn: 'Paintings', icon: 'painting' },
  { slug: 'games', nameAr: 'ألعاب فاخرة', nameEn: 'Luxury Games', icon: 'chess' },
];

const PRODUCTS = [
  { slug: 'chinese-vase-1', cat: 'vases', titleAr: 'مزهرية صينية مطلية يدويًا', titleEn: 'Hand-Painted Chinese Porcelain Vase', era: 'أواخر القرن التاسع عشر', eraEn: 'Late 19th Century', origin: 'الصين', originEn: 'China', material: 'خزف مطلي بالذهب', materialEn: 'Gold-gilded porcelain', condition: 'ممتازة — ترميم طفيف بالقاعدة', conditionEn: 'Excellent — minor restoration at base', price: 18500, oldPrice: 22000, badge: 'قطعة نادرة', icon: 'vase', stock: 1, descAr: 'مزهرية خزفية أصلية بزخارف يدوية دقيقة تعود لأواخر القرن التاسع عشر، برسومات تقليدية من الطيور وأزهار اللوتس، وتفاصيل مذهّبة على الحواف.', descEn: 'An authentic porcelain vase with fine hand-painted decoration from the late 19th century, featuring traditional bird and lotus motifs with gilded edge detailing.' },
  { slug: 'french-chandelier', cat: 'lighting', titleAr: 'ثريا كريستال فرنسية', titleEn: 'French Crystal Chandelier', era: 'حقبة آرت ديكو 1920', eraEn: 'Art Deco era, 1920s', origin: 'فرنسا', originEn: 'France', material: 'كريستال وبرونز مذهّب', materialEn: 'Crystal and gilded bronze', condition: 'جيدة جدًا — كامل القطع الأصلية', conditionEn: 'Very good — all original parts intact', price: 42000, oldPrice: null, badge: 'توثيق أصلي', icon: 'chandelier', stock: 1, descAr: 'ثريا فاخرة من حقبة آرت ديكو، مكوّنة من بلورات كريستال مقطوعة يدويًا على هيكل برونزي مذهّب، بحالة أصلية نادرة تحمل توقيع الصانع.', descEn: 'A luxurious Art Deco-era chandelier featuring hand-cut crystal on a gilded bronze frame, in rare original condition bearing the maker\u2019s mark.' },
  { slug: 'rococo-mirror', cat: 'mirrors', titleAr: 'مرآة مؤطرة بالذهب الروكوكو', titleEn: 'Gold Rococo Framed Mirror', era: 'القرن الثامن عشر', eraEn: '18th Century', origin: 'إيطاليا', originEn: 'Italy', material: 'خشب منحوت مذهّب وزجاج أصلي', materialEn: 'Carved gilded wood and original glass', condition: 'أصلية بالكامل', conditionEn: 'Fully original', price: 31500, oldPrice: 36000, badge: 'مقتنى المتاحف', icon: 'mirror', stock: 1, descAr: 'مرآة بإطار خشبي منحوت يدويًا بطراز الروكوكو الإيطالي، مغطى بورق الذهب الأصلي، بزجاج عتيق يحمل بصمات الزمن المميزة.', descEn: 'A hand-carved wooden mirror frame in the Italian Rococo style, covered in original gold leaf, with antique glass bearing the distinctive marks of time.' },
  { slug: 'victorian-clock', cat: 'clocks', titleAr: 'ساعة طاولة برونزية فيكتورية', titleEn: 'Victorian Bronze Table Clock', era: 'منتصف القرن التاسع عشر', eraEn: 'Mid-19th Century', origin: 'إنجلترا', originEn: 'England', material: 'برونز وميناء رخامي', materialEn: 'Bronze with marble face', condition: 'تعمل بآلية أصلية مجددة', conditionEn: 'Working, original movement restored', price: 15200, oldPrice: null, badge: null, icon: 'clock', stock: 2, descAr: 'ساعة طاولة برونزية من الحقبة الفيكتورية، بآلية ميكانيكية أصلية أعيد ضبطها من قبل خبراء الساعات الأثرية، وقاعدة رخامية منحوتة.', descEn: 'A Victorian-era bronze table clock with an original mechanical movement restored by antique clock specialists, set on a carved marble base.' },
  { slug: 'greek-statue', cat: 'sculptures', titleAr: 'تمثال رخامي إغريقي الطراز', titleEn: 'Greek-Style Marble Statue', era: 'إحياء كلاسيكي، القرن التاسع عشر', eraEn: '19th-century Classical Revival', origin: 'اليونان', originEn: 'Greece', material: 'رخام كرارا', materialEn: 'Carrara marble', condition: 'ممتازة', conditionEn: 'Excellent', price: 27800, oldPrice: null, badge: 'قطعة نادرة', icon: 'statue', stock: 1, descAr: 'منحوتة رخامية على الطراز الإغريقي الكلاسيكي، منحوتة يدويًا من رخام كرارا الإيطالي الفاخر، بتفاصيل دقيقة تعكس براعة النحت الكلاسيكي.', descEn: 'A classical Greek-style marble sculpture, hand-carved from fine Italian Carrara marble, with intricate detailing reflecting masterful classical craftsmanship.' },
  { slug: 'damascus-jewelry-box', cat: 'boxes', titleAr: 'صندوق مجوهرات مطعّم بالصدف', titleEn: 'Mother-of-Pearl Inlaid Jewelry Box', era: 'أوائل القرن العشرين', eraEn: 'Early 20th Century', origin: 'دمشق', originEn: 'Damascus', material: 'خشب الجوز وطعمية الصدف', materialEn: 'Walnut wood with mother-of-pearl inlay', condition: 'أصلية — بطانة مخملية مستبدلة', conditionEn: 'Original — velvet lining replaced', price: 6400, oldPrice: 7900, badge: null, icon: 'chest', stock: 3, descAr: 'صندوق مجوهرات دمشقي تقليدي، مطعّم بالصدف والعرق بزخارف هندسية متقنة، من أعمال الحرفيين الدمشقيين في أوائل القرن العشرين.', descEn: 'A traditional Damascene jewelry box inlaid with mother-of-pearl in intricate geometric patterns, crafted by Damascene artisans in the early 20th century.' },
  { slug: 'french-oil-painting', cat: 'paintings', titleAr: 'لوحة زيتية لمشهد ريفي', titleEn: 'Oil Painting of a Countryside Scene', era: 'أواخر القرن التاسع عشر', eraEn: 'Late 19th Century', origin: 'فرنسا', originEn: 'France', material: 'زيت على قماش، إطار خشبي مذهّب', materialEn: 'Oil on canvas, gilded wooden frame', condition: 'مرممة باحترافية', conditionEn: 'Professionally restored', price: 24900, oldPrice: null, badge: 'توثيق أصلي', icon: 'painting', stock: 1, descAr: 'لوحة زيتية أصلية تصوّر مشهدًا ريفيًا بأسلوب الانطباعية الفرنسية المبكرة، بإطار خشبي مذهّب أصلي من نفس الحقبة.', descEn: 'An original oil painting depicting a countryside scene in early French Impressionist style, in its original gilded wooden frame from the same era.' },
  { slug: 'ivory-chess-set', cat: 'games', titleAr: 'طقم شطرنج عاجي منحوت يدويًا', titleEn: 'Hand-Carved Ivory Chess Set', era: 'القرن التاسع عشر', eraEn: '19th Century', origin: 'الهند', originEn: 'India', material: 'عاج وأبنوس', materialEn: 'Ivory and ebony', condition: 'كامل القطع 32/32', conditionEn: 'Complete set, 32/32 pieces', price: 19700, oldPrice: null, badge: null, icon: 'chess', stock: 1, descAr: 'طقم شطرنج فاخر منحوت يدويًا بتفاصيل بالغة الدقة، القطع البيضاء من العاج الطبيعي والسوداء من خشب الأبنوس، بحالة كاملة ونادرة.', descEn: 'A luxurious hand-carved chess set with extremely fine detail — white pieces in natural ivory and black pieces in ebony wood, complete and in rare condition.' },
];

const AUCTIONS = [
  { lot: 'LOT 014', titleAr: 'خنجر مرصّع بالياقوت — العصر العثماني', titleEn: 'Ruby-Encrusted Dagger — Ottoman Era', catAr: 'أسلحة تراثية', catEn: 'Heritage Weapons', icon: 'dagger', start: 12000, current: 28500, bids: 17, hoursFromNow: 26, status: 'LIVE', descAr: 'خنجر عثماني نادر من أواخر القرن الثامن عشر، بمقبض مرصّع بأحجار الياقوت الطبيعي وزخارف فضية مطعّمة يدويًا على النصل والغمد.', descEn: 'A rare Ottoman dagger from the late 18th century, its handle set with natural ruby stones and hand-inlaid silver decoration on both blade and sheath.' },
  { lot: 'LOT 015', titleAr: 'سجادة حريرية فارسية أصلية', titleEn: 'Authentic Persian Silk Carpet', catAr: 'سجاد فاخر', catEn: 'Luxury Carpets', icon: 'carpet', start: 30000, current: 52000, bids: 24, hoursFromNow: 4, status: 'LIVE', descAr: 'سجادة حريرية يدوية الحياكة من مدينة قُم الفارسية، بكثافة عقد فائقة الدقة وألوان طبيعية محفوظة بحالة استثنائية منذ أكثر من قرن.', descEn: 'A hand-woven silk carpet from the Persian city of Qom, with an exceptionally fine knot density and natural dyes preserved in outstanding condition for over a century.' },
  { lot: 'LOT 016', titleAr: 'إبريق فضي منقوش — الحقبة المملوكية', titleEn: 'Engraved Silver Ewer — Mamluk Era', catAr: 'معادن ثمينة', catEn: 'Precious Metalwork', icon: 'vase', start: 9000, current: 15400, bids: 11, hoursFromNow: 50, status: 'LIVE', descAr: 'إبريق فضي بنقوش هندسية وكتابات كوفية مملوكية الطراز، من أعمال الحرفيين المهرة في القاهرة القديمة.', descEn: 'A silver ewer with geometric engravings and Kufic-style inscriptions in the Mamluk tradition, crafted by skilled artisans in old Cairo.' },
  { lot: 'LOT 017', titleAr: 'خزانة عرض إنجليزية بالماهوجني', titleEn: 'English Mahogany Display Cabinet', catAr: 'أثاث فاخر', catEn: 'Luxury Furniture', icon: 'chest', start: 20000, current: 20000, bids: 0, hoursFromNow: 96, status: 'UPCOMING', descAr: 'خزانة عرض إنجليزية من خشب الماهوجني الفاخر بواجهات زجاجية منحنية يدويًا، تعود لأوائل القرن العشرين.', descEn: 'An English display cabinet in fine mahogany with hand-curved glass fronts, dating to the early 20th century.' },
  { lot: 'LOT 011', titleAr: 'قلادة ذهبية بأحجار الزمرد', titleEn: 'Gold Necklace with Emerald Stones', catAr: 'مجوهرات أثرية', catEn: 'Antique Jewelry', icon: 'necklace', start: 40000, current: 71000, bids: 33, hoursFromNow: -1, status: 'CLOSED', descAr: 'قلادة ذهبية عيار 21 مرصّعة بأحجار الزمرد الطبيعي، من تصميم متأثر بالحلي الملكية في أوائل القرن العشرين.', descEn: '21-karat gold necklace set with natural emerald stones, in a design influenced by royal jewelry of the early 20th century.' },
  { lot: 'LOT 018', titleAr: 'بيانو أثري مذهّب الحواف', titleEn: 'Antique Piano with Gilded Edges', catAr: 'آلات موسيقية', catEn: 'Musical Instruments', icon: 'piano', start: 55000, current: 55000, bids: 0, hoursFromNow: 120, status: 'UPCOMING', descAr: 'بيانو نصف ذيلي أوروبي بحواف مذهّبة منحوتة يدويًا، آلية أصلية مجددة بالكامل من قبل خبراء ترميم الآلات الموسيقية.', descEn: 'A European baby grand piano with hand-carved gilded edges, its original mechanism fully restored by musical instrument restoration specialists.' },
];

async function run() {
  const db = await initDb();

  const categoryIds = {};
  for (const c of CATEGORIES) {
    const existing = await db.queryOne('SELECT id FROM categories WHERE slug = ?', [c.slug]);
    const id = existing?.id || newId();
    if (!existing) {
      await db.execute('INSERT INTO categories (id, slug, name_ar, name_en, icon) VALUES (?,?,?,?,?)', [id, c.slug, c.nameAr, c.nameEn, c.icon]);
    }
    categoryIds[c.slug] = id;
  }

  for (const p of PRODUCTS) {
    const existing = await db.queryOne('SELECT id FROM products WHERE slug = ?', [p.slug]);
    if (existing) continue;
    await db.execute(
      `INSERT INTO products
       (id, slug, category_id, title_ar, title_en, era, origin, material, condition_text,
        description_ar, description_en, price_halalas, old_price_halalas, stock, badge, icon)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        newId(), p.slug, categoryIds[p.cat], p.titleAr, p.titleEn, p.era, p.origin, p.material, p.condition,
        p.descAr, p.descEn, toHalalas(p.price), p.oldPrice ? toHalalas(p.oldPrice) : null, p.stock, p.badge, p.icon,
      ]
    );
  }

  for (const a of AUCTIONS) {
    const existing = await db.queryOne('SELECT id FROM auctions WHERE lot_code = ?', [a.lot]);
    if (existing) continue;
    const endsAt = toDbDateTime(new Date(Date.now() + a.hoursFromNow * 60 * 60 * 1000));
    await db.execute(
      `INSERT INTO auctions
       (id, lot_code, title_ar, title_en, category_ar, category_en, description_ar, description_en,
        icon, start_price_halalas, current_bid_halalas, bids_count, status, ends_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [newId(), a.lot, a.titleAr, a.titleEn, a.catAr, a.catEn, a.descAr, a.descEn, a.icon, toHalalas(a.start), toHalalas(a.current), a.bids, a.status, endsAt]
    );
  }

  // حساب مدير تجريبي للاختبار المحلي فقط — غيّر كلمة المرور فورًا (أو احذف الحساب) قبل أي استخدام حقيقي
  const adminEmail = 'admin@pieceandstory.com';
  const existingAdmin = await db.queryOne('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    const hash = await hashPassword('ChangeMe123!');
    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?,?,?,?, 'ADMIN')`,
      [newId(), adminEmail, hash, 'مدير المتجر']
    );
    logger.info(`تم إنشاء حساب مدير تجريبي: ${adminEmail} / ChangeMe123! — غيّر كلمة المرور فورًا`);
  }
  logger.info(`اكتملت تعبئة البيانات بنجاح (محرّك قاعدة البيانات: ${db.driver}).`);
  process.exit(0);
}

run().catch((e) => {
  logger.error('فشلت تعبئة البيانات', { message: e.message });
  process.exit(1);
});
