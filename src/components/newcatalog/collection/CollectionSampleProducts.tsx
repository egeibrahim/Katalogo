const PLACEHOLDER_IMG = "/placeholder.svg";

type SampleProduct = {
  title: string;
  code: string;
  price: string;
  badge?: string;
  img: string;
};

const SAMPLE_PRODUCTS: SampleProduct[] = [
  { title: "Sample Product 1", code: "#S001", price: "From $9.99", badge: "BESTSELLER", img: PLACEHOLDER_IMG },
  { title: "Sample Product 2", code: "#S002", price: "From $14.99", badge: "BESTSELLER", img: PLACEHOLDER_IMG },
  { title: "Sample Product 3", code: "#S003", price: "From $5.99", badge: "BESTSELLER", img: PLACEHOLDER_IMG },
  { title: "Sample Product 4", code: "#S004", price: "From $6.99", badge: "BESTSELLER", img: PLACEHOLDER_IMG },
];

export function CollectionSampleProducts() {
  return (
    <section className="ts-container" aria-label="Sample products">
      <div className="ru-related-grid" role="list" aria-label="Products">
        {SAMPLE_PRODUCTS.map((p) => (
          <article key={p.code} className="ru-related-card" role="listitem">
            <div className="ru-related-imgwrap">
              {p.badge ? <span className="ru-related-badge">{p.badge}</span> : null}
              <img src={p.img} alt={`${p.title} product image`} loading="lazy" className="ru-related-img" />
            </div>
            <div className="ru-related-meta">
              <p className="ru-related-title">{p.title}</p>
              <p className="ru-related-code">{p.code}</p>
              <p className="ru-related-price">{p.price}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
