import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { 
  removeFromCart, 
  updateCartItemQuantity, 
  clearCart,
  createOrder,
  selectCartTotal 
} from '../store/slices/orderSlice';
import { ShoppingCartIcon, TrashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/currency';

const Cart: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { cart, orderLoading } = useSelector((state: RootState) => state.orders);
  const cartTotal = useSelector(selectCartTotal);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      dispatch(removeFromCart(productId));
    } else {
      dispatch(updateCartItemQuantity({ productId, qty: newQuantity }));
    }
  };

  const handleRemoveItem = (productId: string) => {
    dispatch(removeFromCart(productId));
    toast.success('Item removed from cart');
  };

  const handleClearCart = () => {
    dispatch(clearCart());
    toast.success('Cart cleared');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item.productId,
          qty: item.qty,
        })),
      };

      await dispatch(createOrder(orderData)).unwrap();
      toast.success('Order placed successfully!');
    } catch (error) {
      // Error is handled by the thunk
    }
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCartIcon className="mx-auto h-24 w-24 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Your cart is empty</h3>
        <p className="mt-2 text-sm text-gray-500">
          Start shopping to add items to your cart.
        </p>
        <div className="mt-6">
          <a
            href="/products"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            Browse Products
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
        <button
          onClick={handleClearCart}
          className="text-sm text-red-600 hover:text-red-500"
        >
          Clear Cart
        </button>
      </div>

      {/* Cart Items */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {cart.map((item) => (
            <div key={item.productId} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">{formatINR(item.price)} each</p>
                  <p className="text-sm text-gray-500">Stock: {item.stock}</p>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityChange(item.productId, item.qty - 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-700"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{item.qty}</span>
                    <button
                      onClick={() => handleQuantityChange(item.productId, item.qty + 1)}
                      disabled={item.qty >= item.stock}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-900">
                      {formatINR(Number(item.price) * item.qty)}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item.productId)}
                    className="p-2 text-red-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex justify-between text-lg font-medium">
            <span>Total</span>
            <span>{formatINR(cartTotal)}</span>
          </div>
          
          <div className="text-sm text-gray-500">
            {cart.length} item{cart.length !== 1 ? 's' : ''} in your cart
          </div>

          <button
            onClick={handleCheckout}
            disabled={orderLoading}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {orderLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Proceed to Checkout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
