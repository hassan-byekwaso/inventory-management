import { Plus, Trash2 } from "lucide-react";

export default function OrderComposer({ products, items, setItems, showPrice = false }) {
  function addItem() {
    const available = products.find((product) => !items.some((item) => item.productId === product.id));
    if (available) setItems([...items, { productId: available.id, quantity: 1, unitPrice: Number(available.sellingPrice) }]);
  }

  function updateItem(index, patch) {
    setItems(items.map((item, current) => current === index ? { ...item, ...patch } : item));
  }

  return (
    <div className="order-composer">
      <div className="form-section-heading">
        <div><strong>Line items</strong><small>Choose products and quantities</small></div>
        <button type="button" className="button button-outline button-small" onClick={addItem} disabled={products.length === items.length}>
          <Plus size={15} /> Add product
        </button>
      </div>
      {!items.length && <div className="field-hint">Add at least one product to continue.</div>}
      {items.map((item, index) => (
        <div className={`order-line ${showPrice ? "order-line-price" : ""}`} key={`${index}-${item.productId}`}>
          <label className="field order-product-field">
            <span>Product</span>
            <select value={item.productId} onChange={(event) => {
              const product = products.find((entry) => entry.id === event.target.value);
              updateItem(index, { productId: event.target.value, unitPrice: Number(product?.sellingPrice || 0) });
            }} required>
              {products.filter((product) => product.id === item.productId || !items.some((other, otherIndex) => otherIndex !== index && other.productId === product.id)).map((product) => (
                <option key={product.id} value={product.id}>{product.name} · {product.sku} · {product.currentStock} in stock</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quantity</span>
            <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} required />
          </label>
          {showPrice && (
            <label className="field">
              <span>Unit price</span>
              <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) })} required />
            </label>
          )}
          <button type="button" className="icon-button danger-icon" onClick={() => setItems(items.filter((_, current) => current !== index))} aria-label="Remove item">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
