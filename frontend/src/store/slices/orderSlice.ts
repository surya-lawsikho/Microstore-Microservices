import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService, Order, CreateOrderRequest } from '../../services/api';
import toast from 'react-hot-toast';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
}

interface OrderState {
  orders: Order[];
  cart: CartItem[];
  loading: boolean;
  error: string | null;
  orderLoading: boolean;
}

const initialState: OrderState = {
  orders: [],
  cart: [],
  loading: false,
  error: null,
  orderLoading: false,
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const orders = await apiService.getUserOrders();
      return orders;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch orders');
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: CreateOrderRequest, { rejectWithValue }) => {
    try {
      const order = await apiService.createOrder(orderData);
      toast.success('Order placed successfully!');
      return order;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create order');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.cart.find(item => item.productId === action.payload.productId);
      if (existingItem) {
        if (existingItem.qty + action.payload.qty <= action.payload.stock) {
          existingItem.qty += action.payload.qty;
        } else {
          toast.error('Not enough stock available');
        }
      } else {
        state.cart.push(action.payload);
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter(item => item.productId !== action.payload);
    },
    updateCartItemQuantity: (state, action: PayloadAction<{ productId: string; qty: number }>) => {
      const item = state.cart.find(item => item.productId === action.payload.productId);
      if (item) {
        if (action.payload.qty <= 0) {
          state.cart = state.cart.filter(cartItem => cartItem.productId !== action.payload.productId);
        } else if (action.payload.qty <= item.stock) {
          item.qty = action.payload.qty;
        } else {
          toast.error('Not enough stock available');
        }
      }
    },
    clearCart: (state) => {
      state.cart = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.orderLoading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.orderLoading = false;
        state.orders.unshift(action.payload);
        state.cart = []; // Clear cart after successful order
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.orderLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addToCart, 
  removeFromCart, 
  updateCartItemQuantity, 
  clearCart, 
  clearError 
} = orderSlice.actions;

// Selectors
export const selectCartTotal = (state: { orders: OrderState }) => {
  return state.orders.cart.reduce((total, item) => total + (Number(item.price) * item.qty), 0);
};

export const selectCartItemCount = (state: { orders: OrderState }) => {
  return state.orders.cart.reduce((count, item) => count + item.qty, 0);
};

export default orderSlice.reducer;
