import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../store/slices/productSlice';

const AdminProducts: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { products, loading } = useSelector((s: RootState) => s.products);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { name: string; price: string; stock: string }>>({});

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const normalizePrice = (raw: string): number => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    return Number.parseFloat(cleaned);
  };

  const normalizeStock = (raw: string): number => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    return Number.parseInt(cleaned || '0', 10);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const priceNum = normalizePrice(price);
    const stockNum = normalizeStock(stock);
    if (Number.isNaN(priceNum) || Number.isNaN(stockNum)) return;
    await dispatch(createProduct({ name: name.trim(), price: priceNum, stock: stockNum } as any));
    setName('');
    setPrice('');
    setStock('');
  };

  const beginEdit = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setEditValues((prev) => ({
      ...prev,
      [id]: { name: p.name, price: String(p.price), stock: String(p.stock) },
    }));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    const values = editValues[id];
    if (!values) return;
    const payload: any = {
      name: values.name,
      price: normalizePrice(values.price),
      stock: normalizeStock(values.stock),
    };
    await dispatch(updateProduct({ id, productData: payload }));
    setEditingId(null);
  };

  const remove = async (id: string) => {
    await dispatch(deleteProduct(id));
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Products</h1>

      <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-sm text-gray-500">Name</label>
          <input className="border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-500">Price</label>
          <input className="border rounded px-3 py-2" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-500">Stock</label>
          <input className="border rounded px-3 py-2" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 w-full md:w-auto" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-4 py-2"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedProducts.map((p) => {
              const isEditing = editingId === p.id;
              const ev = editValues[p.id] || { name: p.name, price: String(p.price), stock: String(p.stock) };
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input className="border rounded px-2 py-1 w-full" value={ev.name} onChange={(e) => setEditValues((prev) => ({ ...prev, [p.id]: { ...ev, name: e.target.value } }))} />
                    ) : (
                      <span>{p.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input className="border rounded px-2 py-1 w-full" value={ev.price} onChange={(e) => setEditValues((prev) => ({ ...prev, [p.id]: { ...ev, price: e.target.value } }))} />
                    ) : (
                      <span>₹{p.price}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input className="border rounded px-2 py-1 w-full" value={ev.stock} onChange={(e) => setEditValues((prev) => ({ ...prev, [p.id]: { ...ev, stock: e.target.value } }))} />
                    ) : (
                      <span>{p.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {isEditing ? (
                      <>
                        <button className="bg-green-600 text-white rounded px-3 py-1" onClick={() => saveEdit(p.id)} disabled={loading}>
                          Save
                        </button>
                        <button className="bg-gray-200 rounded px-3 py-1" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="bg-gray-700 text-white rounded px-3 py-1" onClick={() => beginEdit(p.id)}>
                          Edit
                        </button>
                        <button className="bg-red-600 text-white rounded px-3 py-1" onClick={() => remove(p.id)} disabled={loading}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {sortedProducts.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  {loading ? 'Loading products…' : 'No products yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;


