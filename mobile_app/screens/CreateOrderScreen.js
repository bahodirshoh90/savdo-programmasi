/**
 * Create Order Screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../constants/colors';
import { getCustomers } from '../services/customers';
import { getProducts } from '../services/products';
import { createOrder } from '../services/orders';
import { createSale } from '../services/sales';
import ProductCard from '../components/ProductCard';
import BarcodeScanner from '../components/BarcodeScanner';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreateOrderScreen({ navigation, route }) {
  const orderId = route?.params?.orderId;
  const isLocalId = route?.params?.isLocalId || false;
  const initialOrder = route?.params?.order;
  const isEditMode = !!orderId;
  
  const [customer, setCustomer] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [excessAction, setExcessAction] = useState(null);
  const [requiresAdminApproval, setRequiresAdminApproval] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [productsPage, setProductsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const PRODUCTS_PER_PAGE = 20;

  useFocusEffect(
    useCallback(() => {
      loadProducts('', 1, false); // Load first page
      
      // Load order data if editing
      if (isEditMode && initialOrder) {
        loadOrderData(initialOrder);
      } else if (isEditMode && orderId) {
        loadOrderById(orderId, isLocalId);
      }
      
      // Cleanup on unmount
      return () => {
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
      };
    }, [orderId, isLocalId, isEditMode])
  );

  const loadMoreProducts = () => {
    if (!productSearchQuery && hasMoreProducts && !isLoading) {
      loadProducts('', productsPage + 1, true); // Append next page
    }
  };

  // Cleanup search timeout when modal closes
  useEffect(() => {
    if (!showCustomerModal && searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  }, [showCustomerModal]);

  const loadProducts = async (searchQuery = '', page = 1, append = false) => {
    setIsLoading(true);
    try {
      // If searching, get all results (no pagination)
      // If not searching, get paginated results
      const skip = (page - 1) * PRODUCTS_PER_PAGE;
      const data = await getProducts(
        searchQuery,
        searchQuery ? 0 : skip,
        searchQuery ? 1000 : PRODUCTS_PER_PAGE
      );
      
      // Ensure data is an array
      const productsArray = Array.isArray(data) ? data : [];
      
      if (append) {
        // Append to existing products
        setProducts([...products, ...productsArray]);
        filterProductsLocally([...products, ...productsArray], productSearchQuery);
      } else {
        // Replace products
        setProducts(productsArray);
        filterProductsLocally(data, productSearchQuery);
      }
      
      // Check if there are more products
      setHasMoreProducts(searchQuery ? false : data.length === PRODUCTS_PER_PAGE);
      setProductsPage(page);
    } catch (error) {
      Alert.alert('Xatolik', 'Mahsulotlarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProductsLocally = (productsList, query) => {
    if (!query.trim()) {
      setFilteredProducts(productsList);
      return;
    }

    const searchLower = query.toLowerCase();
    const filtered = productsList.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchLower)) ||
        (p.brand && p.brand.toLowerCase().includes(searchLower))
    );
    setFilteredProducts(filtered);
  };

  useEffect(() => {
    if (productSearchQuery.trim()) {
      // Local filtering for instant results
      filterProductsLocally(products, productSearchQuery);
      
      // Also search on server with debounce
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      const timeout = setTimeout(() => {
        loadProducts(productSearchQuery, 1, false); // Reset to page 1 when searching
      }, 500);
      
      setSearchTimeout(timeout);
    } else {
      setFilteredProducts(products);
      if (products.length === 0) {
        loadProducts('', 1, false); // Load first page
      }
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [productSearchQuery]);

  const loadOrderById = async (id, isLocal) => {
    try {
      setIsLoading(true);
      const order = await getOrder(id, isLocal);
      if (order) {
        await loadOrderData(order);
      } else {
        Alert.alert('Xatolik', 'Buyurtma topilmadi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Xatolik', `Buyurtmani yuklashda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrderData = async (order) => {
    try {
      // Set customer
      if (order.customer_id) {
        // Load customers to find the customer
        const allCustomers = await getCustomers('');
        const foundCustomer = allCustomers.find(c => c.id === order.customer_id);
        if (foundCustomer) {
          setCustomer(foundCustomer);
        } else {
          // Create a minimal customer object
          setCustomer({
            id: order.customer_id,
            name: order.customer_name || 'Noma\'lum mijoz',
          });
        }
      }

      // Set selected products
      if (order.items && Array.isArray(order.items)) {
        const productList = await getProducts('', 0, 1000);
        // Ensure productList is an array
        const productsArray = Array.isArray(productList) ? productList : [];
        const productsList = order.items.map(item => {
          const product = productsArray.find(p => p && p.id === item.product_id);
          if (!product) {
            // If product not found, use item data as is
            return {
              product_id: item.product_id,
              product_name: item.product_name || item.name || '',
              requested_quantity: item.requested_quantity || 1,
              unit_price: item.unit_price || item.price || 0,
              subtotal: item.subtotal || (item.requested_quantity || 1) * (item.unit_price || item.price || 0),
            };
          }
          
          // Determine price based on customer type
          const customerType = order.customer?.customer_type || order.customer_type;
          const price = customerType === 'wholesale'
            ? (product.wholesale_price || 0)
            : customerType === 'retail'
            ? (product.retail_price || 0)
            : (product.regular_price || 0);
          
          return {
            product_id: item.product_id,
            product_name: item.product_name || item.name || product.name || '',
            requested_quantity: item.requested_quantity || 1,
            unit_price: item.unit_price || item.price || price,
            subtotal: item.subtotal || (item.requested_quantity || 1) * (item.unit_price || item.price || price),
          };
        });
        setSelectedProducts(productsList);
      }

      // Set other fields
      if (order.notes) setNotes(order.notes);
    } catch (error) {
      console.error('Error loading order data:', error);
    }
  };

  const loadCustomers = async (searchQuery = '') => {
    setIsLoadingCustomers(true);
    try {
      const data = await getCustomers(searchQuery);
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Xatolik', 'Mijozlarni yuklashda xatolik');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleSelectCustomer = () => {
    setShowCustomerModal(true);
    setCustomerSearchQuery('');
    // Load customers when modal opens
    loadCustomers('');
  };

  const handleCustomerSelect = (selectedCustomer) => {
    setCustomer(selectedCustomer);
    setShowCustomerModal(false);
    setCustomerSearchQuery('');
    
    // Update prices for already selected products based on customer type
    const productsArray = Array.isArray(products) ? products : [];
    if (selectedProducts.length > 0 && productsArray.length > 0) {
      setSelectedProducts(prevProducts => {
        return prevProducts.map((selectedProduct) => {
          // Find the product in products list to get all prices
          const product = productsArray.find(p => p && p.id === selectedProduct.product_id);
          if (!product) {
            // If product not found in current products list, keep current price
            return selectedProduct;
          }
          
          // Determine price based on customer type
          const newPrice = selectedCustomer?.customer_type === 'wholesale'
            ? (product.wholesale_price || 0)
            : selectedCustomer?.customer_type === 'retail'
            ? (product.retail_price || 0)
            : (product.regular_price || 0);
          
          return {
            ...selectedProduct,
            unit_price: newPrice,
            subtotal: selectedProduct.requested_quantity * newPrice,
          };
        });
      });
    }
  };

  // Use customers directly since server already filters when search query is provided
  // Local filtering is only used if we have cached data and want to refine search
  const filteredCustomers = customers;

  const handleBarcodeScan = async (barcode) => {
    console.log('Barcode scanned:', barcode);
    setShowScanner(false);
    
    // Search for product by barcode
    setProductSearchQuery(barcode);
    
    // Load products with barcode search
    try {
      const searchResults = await getProducts(barcode, 0, 1000);
      // Ensure searchResults is an array
      const resultsArray = Array.isArray(searchResults) ? searchResults : [];
      if (resultsArray.length > 0) {
        // Find exact barcode match
        const matchedProduct = resultsArray.find(
          p => p && p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()
        );
        
        if (matchedProduct) {
          // Auto-add product to cart
          handleAddProduct(matchedProduct);
          setProductSearchQuery(''); // Clear search after adding
          Alert.alert('✅ Muvaffaqiyatli', `Mahsulot qo'shildi: ${matchedProduct.name}`);
        } else {
          // Show search results
          Alert.alert(
            'ℹ️ Natijalar',
            `${resultsArray.length} ta mahsulot topildi. Iltimos, kerakli mahsulotni tanlang.`
          );
        }
      } else {
        Alert.alert('❌ Topilmadi', `Barcode "${barcode}" bo'yicha mahsulot topilmadi.`);
        setProductSearchQuery(barcode); // Keep barcode in search for manual selection
      }
    } catch (error) {
      console.error('Error searching barcode:', error);
      Alert.alert('Xatolik', `Mahsulot qidirishda xatolik: ${error.message || 'Noma\'lum xatolik'}`);
    }
  };

  const handleAddProduct = (product) => {
    const existingIndex = selectedProducts.findIndex(
      (p) => p.product_id === product.id
    );

    if (existingIndex >= 0) {
      // Increase quantity
      const updated = [...selectedProducts];
      updated[existingIndex].requested_quantity += 1;
      updated[existingIndex].subtotal =
        updated[existingIndex].requested_quantity * updated[existingIndex].unit_price;
      setSelectedProducts(updated);
    } else {
      // Add new product
      const price = customer?.customer_type === 'wholesale'
        ? product.wholesale_price
        : customer?.customer_type === 'retail'
        ? product.retail_price
        : product.regular_price;

      setSelectedProducts([
        ...selectedProducts,
        {
          product_id: product.id,
          product_name: product.name,
          requested_quantity: 1,
          unit_price: price || 0,
          subtotal: price || 0,
        },
      ]);
    }
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product_id !== productId));
  };

  const handleQuantityChange = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemoveProduct(productId);
      return;
    }

    const updated = selectedProducts.map((p) => {
      if (p.product_id === productId) {
        return {
          ...p,
          requested_quantity: quantity,
          subtotal: quantity * p.unit_price,
        };
      }
      return p;
    });
    setSelectedProducts(updated);
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmit = () => {
    console.log('handleSubmit called', { isEditMode, orderId });
    
    // In edit mode, just update the order (no payment needed)
    if (isEditMode && orderId) {
      handleUpdateOrder();
      return;
    }
    
    if (!customer) {
      if (Platform.OS === 'web') {
        alert('Xatolik: Iltimos, mijozni tanlang');
      } else {
        Alert.alert('Xatolik', 'Iltimos, mijozni tanlang');
      }
      return;
    }

    if (selectedProducts.length === 0) {
      if (Platform.OS === 'web') {
        alert('Xatolik: Iltimos, kamida bitta mahsulot qo\'shing');
      } else {
        Alert.alert('Xatolik', 'Iltimos, kamida bitta mahsulot qo\'shing');
      }
      return;
    }

    // Confirmation dialog before submitting
    const totalAmount = calculateTotal();
    const payment = paymentAmount ? parseFloat(paymentAmount) : null;
    const paymentDisplay = payment !== null && payment > 0 
      ? payment.toLocaleString('uz-UZ') + ' so\'m'
      : 'To\'lanmagan';
    
    const paymentMethodText = paymentMethod === 'cash' ? 'Naqt' : paymentMethod === 'card' ? 'Karta' : 'O\'tkazma';
    
    console.log('Showing confirmation dialog');
    
    // For web, use window.confirm which is more reliable
    if (Platform.OS === 'web') {
      const message = 
        `⚠️ Sotuvni yakunlash\n\n` +
        `Mijoz: ${customer.name}\n` +
        `Jami summa: ${totalAmount.toLocaleString('uz-UZ')} so'm\n` +
        `To'lov: ${paymentDisplay}\n` +
        `To'lov usuli: ${paymentMethodText}\n\n` +
        `Sotuvni yakunlashni tasdiqlaysizmi?`;
      
      const confirmed = window.confirm(message);
      if (confirmed) {
        console.log('User confirmed sale submission via window.confirm');
        submitSale();
      } else {
        console.log('User cancelled sale submission');
      }
    } else {
      // For native platforms, use Alert.alert
      Alert.alert(
        '⚠️ Sotuvni yakunlash',
        `Mijoz: ${customer.name}\n` +
        `Jami summa: ${totalAmount.toLocaleString('uz-UZ')} so'm\n` +
        `To'lov: ${paymentDisplay}\n` +
        `To'lov usuli: ${paymentMethodText}\n\n` +
        `Sotuvni yakunlashni tasdiqlaysizmi?`,
        [
          {
            text: 'Bekor qilish',
            style: 'cancel',
            onPress: () => {
              console.log('User cancelled sale submission');
            },
          },
          {
            text: 'Ha, yakunlash',
            onPress: () => {
              console.log('User confirmed sale submission via Alert.alert');
              // Use setTimeout to ensure Alert closes before starting submit
              setTimeout(() => {
                submitSale();
              }, 200);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const submitSale = async () => {
    console.log('submitSale called');
    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal();
      const payment = paymentAmount ? parseFloat(paymentAmount) : null;
      
      console.log('Payment validation:', { payment, totalAmount, requiresAdminApproval });
      
      // Validate payment amount if provided
      if (payment !== null && payment < 0) {
        setIsSubmitting(false);
        setTimeout(() => {
          if (Platform.OS === 'web') {
            alert('Xatolik: To\'lov summasi manfiy bo\'lishi mumkin emas');
          } else {
            Alert.alert('Xatolik', 'To\'lov summasi manfiy bo\'lishi mumkin emas');
          }
        }, 100);
        return;
      }
      
      // CRITICAL: If no payment amount is entered and admin approval is NOT requested, prevent sale
      if (payment === null && !requiresAdminApproval) {
        console.error('No payment amount entered and admin approval not requested - preventing sale');
        setIsSubmitting(false);
        setTimeout(() => {
          const errorMsg = 'To\'lov summasi kiritilmagan. Iltimos, to\'lov summasini kiriting yoki "Admin ruxsati kerak" ni belgilang.';
          if (Platform.OS === 'web') {
            alert('Xatolik: ' + errorMsg);
          } else {
            Alert.alert('Xatolik', errorMsg);
          }
        }, 100);
        return;
      }
      
      // If payment is 0 or empty string (but not null because of admin approval), also check
      if (payment !== null && payment === 0 && !requiresAdminApproval) {
        console.error('Payment is zero and admin approval not requested - preventing sale');
        setIsSubmitting(false);
        setTimeout(() => {
          const errorMsg = 'To\'lov summasi 0 so\'m. Iltimos, to\'lov summasini kiriting yoki "Admin ruxsati kerak" ni belgilang.';
          if (Platform.OS === 'web') {
            alert('Xatolik: ' + errorMsg);
          } else {
            Alert.alert('Xatolik', errorMsg);
          }
        }, 100);
        return;
      }

      // If payment is less than total and no approval requested, check debt limit
      if (payment !== null && payment < totalAmount && !requiresAdminApproval) {
        const debtAmount = totalAmount - payment;
        const customerDebtLimit = customer.debt_limit;
        const currentDebt = customer.debt_balance || 0;
        
        if (customerDebtLimit !== null && customerDebtLimit > 0) {
          const newDebt = currentDebt + debtAmount;
          if (newDebt > customerDebtLimit) {
            const message = '⚠️ Qarz limiti oshib ketadi!\n\n' +
              `Mijoz "${customer.name}" uchun:\n\n` +
              `Joriy qarz: ${currentDebt.toLocaleString('uz-UZ')} so'm\n` +
              `Qarz limiti: ${customerDebtLimit.toLocaleString('uz-UZ')} so'm\n` +
              `Qo'shiladigan qarz: ${debtAmount.toLocaleString('uz-UZ')} so'm\n` +
              `Yangi qarz: ${newDebt.toLocaleString('uz-UZ')} so'm\n\n` +
              `Admin ruxsati kerak!`;
            
            if (Platform.OS === 'web') {
              if (window.confirm(message + '\n\nAdmin ruxsatiga yuborishni tasdiqlaysizmi?')) {
                setRequiresAdminApproval(true);
                setTimeout(() => {
                  handleSubmitSale(payment, totalAmount, debtAmount);
                }, 200);
              } else {
                setIsSubmitting(false);
              }
            } else {
              Alert.alert(
                '⚠️ Qarz limiti oshib ketadi!',
                `Mijoz "${customer.name}" uchun:\n\n` +
                `Joriy qarz: ${currentDebt.toLocaleString('uz-UZ')} so'm\n` +
                `Qarz limiti: ${customerDebtLimit.toLocaleString('uz-UZ')} so'm\n` +
                `Qo'shiladigan qarz: ${debtAmount.toLocaleString('uz-UZ')} so'm\n` +
                `Yangi qarz: ${newDebt.toLocaleString('uz-UZ')} so'm\n\n` +
                `Admin ruxsati kerak!`,
                [
                  {
                    text: 'Bekor qilish',
                    style: 'cancel',
                    onPress: () => {
                      setIsSubmitting(false);
                    },
                  },
                  {
                    text: 'Admin ruxsatiga yuborish',
                    onPress: () => {
                      setRequiresAdminApproval(true);
                      // Continue with submission
                      setTimeout(() => {
                        handleSubmitSale(payment, totalAmount, debtAmount);
                      }, 200);
                    },
                  },
                ],
                { cancelable: true, onDismiss: () => setIsSubmitting(false) }
              );
            }
            return;
          }
        }

        // Payment is insufficient - ALWAYS require admin approval for debt
        const message = '⚠️ Admin ruxsati kerak\n\n' +
          `Mijoz to'lagan summa (${payment.toLocaleString('uz-UZ')} so'm) jami summadan (${totalAmount.toLocaleString('uz-UZ')} so'm) kam.\n\n` +
          `Qo'shiladigan qarz: ${debtAmount.toLocaleString('uz-UZ')} so'm\n\n` +
          `Qarzga yozish uchun admin ruxsati talab etiladi. Admin tasdiqlashini so'rash?`;
        
        if (Platform.OS === 'web') {
          if (window.confirm(message)) {
            setRequiresAdminApproval(true);
            setExcessAction('debt');
            setTimeout(() => {
              handleSubmitSale(payment, totalAmount, debtAmount);
            }, 200);
          } else {
            setIsSubmitting(false);
          }
        } else {
          Alert.alert(
            '⚠️ Admin ruxsati kerak',
            `Mijoz to'lagan summa (${payment.toLocaleString('uz-UZ')} so'm) jami summadan (${totalAmount.toLocaleString('uz-UZ')} so'm) kam.\n\n` +
            `Qo'shiladigan qarz: ${debtAmount.toLocaleString('uz-UZ')} so'm\n\n` +
            `Qarzga yozish uchun admin ruxsati talab etiladi. Admin tasdiqlashini so'rash?`,
            [
              {
                text: 'Bekor qilish',
                style: 'cancel',
                onPress: () => setIsSubmitting(false),
              },
              {
                text: 'Admin ruxsatiga yuborish',
                onPress: () => {
                  setRequiresAdminApproval(true);
                  setExcessAction('debt');
                  // Use setTimeout to ensure Alert closes before submission
                  setTimeout(() => {
                    handleSubmitSale(payment, totalAmount, debtAmount);
                  }, 200);
                },
              },
            ],
            { cancelable: true, onDismiss: () => setIsSubmitting(false) }
          );
        }
        return;
      }
      
      // Calculate debt amount: if payment is null or less than total
      const finalDebtAmount = payment === null 
        ? totalAmount  // No payment = full debt
        : payment < totalAmount 
          ? totalAmount - payment 
          : 0;
      
      // Final check: if there's debt and admin approval is NOT requested, prevent submission
      if (finalDebtAmount > 0 && !requiresAdminApproval) {
        console.error('Payment insufficient/not provided and admin approval not requested - preventing sale');
        setIsSubmitting(false);
        
        setTimeout(() => {
          const errorMsg = payment === null 
            ? `To'lov summasi kiritilmagan. Qarzga yozish uchun "Admin ruxsati kerak" ni belgilang yoki to'lov miqdorini kiriting.`
            : `To'lov yetarli emas. Qarzga yozish uchun "Admin ruxsati kerak" ni belgilang yoki to'lov miqdorini to'liq kiriting.`;
          if (Platform.OS === 'web') {
            alert(errorMsg);
          } else {
            Alert.alert('Xatolik', errorMsg);
          }
        }, 100);
        return;
      }

      // If payment is null but admin approval is requested, set payment to 0 for API
      const paymentForAPI = payment !== null ? payment : (requiresAdminApproval ? 0 : totalAmount);
      
      console.log('Calling handleSubmitSale with:', { payment, paymentForAPI, totalAmount, requiresAdminApproval, finalDebtAmount });
      
      await handleSubmitSale(paymentForAPI, totalAmount, finalDebtAmount);
    } catch (error) {
      console.error('Error in submitSale:', error);
      setIsSubmitting(false);
      
      setTimeout(() => {
        if (Platform.OS === 'web') {
          alert('Xatolik: ' + (error.message || 'Noma\'lum xatolik'));
        } else {
          Alert.alert('Xatolik', error.message || 'Noma\'lum xatolik');
        }
      }, 100);
    }
  };

  const handleUpdateOrder = async () => {
    console.log('handleUpdateOrder called');
    setIsSubmitting(true);
    
    try {
      if (!customer) {
        Alert.alert('Xatolik', 'Iltimos, mijozni tanlang');
        setIsSubmitting(false);
        return;
      }

      if (selectedProducts.length === 0) {
        Alert.alert('Xatolik', 'Iltimos, kamida bitta mahsulot qo\'shing');
        setIsSubmitting(false);
        return;
      }

      const orderData = {
        customer_id: customer.id,
        items: selectedProducts.map((item) => ({
          product_id: item.product_id,
          requested_quantity: item.requested_quantity,
        })),
        notes: notes || '',
      };
      
      console.log('Updating order with data:', orderData);
      const result = await updateOrder(orderId, orderData, isLocalId);
      
      if (result.success) {
        setIsSubmitting(false);
        Alert.alert('Muvaffaqiyatli', 'Buyurtma yangilandi', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        setIsSubmitting(false);
        Alert.alert('Xatolik', result.error || 'Buyurtmani yangilashda xatolik');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setIsSubmitting(false);
      Alert.alert('Xatolik', error.message || 'Buyurtmani yangilashda xatolik');
    }
  };

  const handleSubmitSale = async (paymentAmountValue, totalAmountValue, debtAmount = 0) => {
    console.log('handleSubmitSale called with:', { paymentAmountValue, totalAmountValue, debtAmount, requiresAdminApproval });
    
    // CRITICAL: If there's debt but admin approval is NOT explicitly requested, prevent sale creation
    if (debtAmount > 0 && !requiresAdminApproval) {
      console.error('Blocking sale: debt exists but admin approval not requested');
      setIsSubmitting(false);
      
      setTimeout(() => {
        const errorMsg = `To'lov yetarli emas. Qarzga yozish uchun "Admin ruxsati kerak" ni belgilang yoki to'lov miqdorini to'liq kiriting.`;
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('Xatolik', errorMsg);
        }
      }, 100);
      return;
    }
    
    // Ensure admin approval is required when payment is insufficient OR explicitly requested
    const needsApproval = debtAmount > 0 || requiresAdminApproval;
    
    try {
      
      // Create new sale
      const saleData = {
        customer_id: customer.id,
        items: selectedProducts.map((item) => ({
          product_id: item.product_id,
          requested_quantity: item.requested_quantity,
        })),
        payment_method: paymentMethod,
        payment_amount: paymentAmountValue || totalAmountValue,
        excess_action: excessAction || (paymentAmountValue && paymentAmountValue > totalAmountValue ? 'return' : null),
        requires_admin_approval: needsApproval, // Always require approval if there's debt
      };

      console.log('Creating sale with data:', saleData);
      const result = await createSale(saleData);
      console.log('Sale creation result:', result);

      // Reset form function
      const resetForm = () => {
        console.log('Resetting form...');
        setSelectedProducts([]);
        setCustomer(null);
        setPaymentAmount('');
        setPaymentMethod('cash');
        setExcessAction(null);
        setRequiresAdminApproval(false);
        setNotes('');
      };

      // Reset form and navigate
      const handleSuccess = () => {
        console.log('handleSuccess called - resetting form and navigating...');
        resetForm();
        console.log('Navigating to OrdersTab...');
        // Use setTimeout to ensure state updates complete before navigation
        setTimeout(() => {
          navigation.navigate('OrdersTab');
        }, 100);
      };

      if (result && result.success) {
        const sale = result.sale || result;
        const requiresApproval = sale.requires_admin_approval;
        const isApproved = sale.admin_approved === true;

        console.log('Sale created successfully:', { sale, requiresApproval, isApproved });

        // IMPORTANT: Set isSubmitting to false FIRST before showing alert
        setIsSubmitting(false);
        console.log('isSubmitting set to false');
        
        // Show success/approval alert
        if (requiresApproval && !isApproved) {
          const message = '⏳ Kutilmoqda\n\nSotuv admin tasdiqini kutmoqda.\n\nSotuv ID: #' + sale.id;
          
          if (Platform.OS === 'web') {
            // For web, use setTimeout to ensure state update completes
            setTimeout(() => {
              alert(message);
              // Handle success after alert is closed
              setTimeout(() => {
                handleSuccess();
              }, 50);
            }, 50);
          } else {
            Alert.alert(
              '⏳ Kutilmoqda',
              'Sotuv admin tasdiqini kutmoqda.\n\nSotuv ID: #' + sale.id,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('Alert OK pressed - calling handleSuccess');
                    handleSuccess();
                  },
                },
              ],
              { cancelable: false }
            );
          }
        } else {
          const message = `✅ Muvaffaqiyatli\n\nSotuv muvaffaqiyatli yaratildi!\n\nSotuv ID: #${sale.id}\nJami: ${totalAmountValue.toLocaleString('uz-UZ')} so'm`;
          
          if (Platform.OS === 'web') {
            // For web, use setTimeout to ensure state update completes
            setTimeout(() => {
              alert(message);
              // Handle success after alert is closed
              setTimeout(() => {
                handleSuccess();
              }, 50);
            }, 50);
          } else {
            Alert.alert(
              '✅ Muvaffaqiyatli',
              `Sotuv muvaffaqiyatli yaratildi!\n\nSotuv ID: #${sale.id}\nJami: ${totalAmountValue.toLocaleString('uz-UZ')} so'm`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('Alert OK pressed - calling handleSuccess');
                    handleSuccess();
                  },
                },
              ],
              { cancelable: false }
            );
          }
        }
      } else {
        console.error('Sale creation failed:', result?.error || 'Unknown error');
        setIsSubmitting(false);
        
        setTimeout(() => {
          if (Platform.OS === 'web') {
            alert('Xatolik: ' + (result?.error || 'Sotuv yaratishda xatolik'));
          } else {
            Alert.alert('Xatolik', result?.error || 'Sotuv yaratishda xatolik');
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error in handleSubmitSale:', error);
      setIsSubmitting(false);
      Alert.alert('Xatolik', error.message || 'Noma\'lum xatolik');
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
      <View style={styles.container}>
      {/* Edit Mode Indicator */}
      {isEditMode && (
        <View style={styles.editModeBanner}>
          <Text style={styles.editModeText}>✏️ Buyurtmani tahrirlash rejimi</Text>
        </View>
      )}
      <ScrollView
        style={[styles.scrollView, isWeb && styles.scrollViewWeb]}
        contentContainerStyle={[
          styles.scrollViewContent,
          isWeb && styles.scrollViewContentWeb,
        ]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={!isWeb}
        scrollEnabled={true}
        bounces={!isWeb}
        alwaysBounceVertical={false}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
      >
      {/* Customer Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mijoz</Text>
        <TouchableOpacity
          style={styles.customerButton}
          onPress={handleSelectCustomer}
        >
          <Text style={styles.customerButtonText}>
            {customer ? customer.name : 'Mijozni tanlang'}
          </Text>
          <Text style={styles.customerButtonIcon}>›</Text>
        </TouchableOpacity>
        {customer ? (
          <View style={styles.customerDetails}>
            <Text style={styles.customerDetailText}>Telefon: {customer.phone || 'N/A'}</Text>
            <Text style={styles.customerDetailText}>
              Turi: {customer.customer_type === 'wholesale' ? 'Ulgurji' : customer.customer_type === 'retail' ? 'Dona' : 'Oddiy'}
            </Text>
            {customer.debt_balance !== undefined && customer.debt_balance !== null ? (
              <Text style={styles.customerDetailText}>
                Qarz balansi: {(customer.debt_balance || 0).toLocaleString('uz-UZ')} so'm
              </Text>
            ) : null}
            {customer.debt_limit !== undefined && customer.debt_limit !== null ? (
              <Text style={styles.customerDetailText}>
                Qarz limiti: {customer.debt_limit.toLocaleString('uz-UZ')} so'm
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Products List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mahsulotlar</Text>
          {filteredProducts.length > 0 && (
            <Text style={styles.productsCount}>
              {filteredProducts.length} ta
            </Text>
          )}
        </View>
        
        {/* Product Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Mahsulot nomi, barcode yoki brend bo'yicha qidiring..."
            value={productSearchQuery}
            onChangeText={setProductSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.scannerButton}
            onPress={() => setShowScanner(true)}
          >
            <Text style={styles.scannerButtonText}>📷</Text>
          </TouchableOpacity>
          {productSearchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setProductSearchQuery('')}
            >
              <Text style={styles.clearSearchButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading && products.length === 0 ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyProductsContainer}>
            <Text style={styles.emptyProductsText}>
              {productSearchQuery ? 'Qidiruv bo\'yicha mahsulotlar topilmadi' : 'Mahsulotlar topilmadi'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.productsGrid}>
              {filteredProducts.map((product, index) => (
                <View 
                  key={product.id} 
                  style={[
                    styles.productWrapper,
                    index % 2 === 0 ? styles.productWrapperLeft : styles.productWrapperRight
                  ]}
                >
                  <ProductCard
                    product={product}
                    onAdd={() => handleAddProduct(product)}
                    style={styles.productCard}
                  />
                </View>
              ))}
            </View>
            
            {/* Pagination Button - Only show when not searching and has more products */}
            {!productSearchQuery && hasMoreProducts && (
              <View style={styles.loadMoreContainer}>
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMoreProducts}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                  ) : (
                    <Text style={styles.loadMoreButtonText}>
                      Ko'proq yuklash ({productsPage * PRODUCTS_PER_PAGE}+ ta ko'rsatilmoqda)
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            {/* Page info when paginated */}
            {!productSearchQuery && filteredProducts.length > 0 && (
              <View style={styles.pageInfoContainer}>
                <Text style={styles.pageInfoText}>
                  {filteredProducts.length} ta mahsulot ko'rsatilmoqda
                  {productsPage > 1 && ` (Sahifa ${productsPage})`}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Payment Section - Hide in edit mode (orders don't have payment) */}
      {!isEditMode && customer && selectedProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To'lov</Text>
          
          {/* Payment Method */}
          <View style={styles.paymentMethodContainer}>
            <Text style={styles.label}>To'lov usuli</Text>
            <View style={styles.paymentMethodButtons}>
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'cash' && styles.paymentMethodButtonActive,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text
                  style={[
                    styles.paymentMethodButtonText,
                    paymentMethod === 'cash' && styles.paymentMethodButtonTextActive,
                  ]}
                >
                  Naqt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'card' && styles.paymentMethodButtonActive,
                ]}
                onPress={() => setPaymentMethod('card')}
              >
                <Text
                  style={[
                    styles.paymentMethodButtonText,
                    paymentMethod === 'card' && styles.paymentMethodButtonTextActive,
                  ]}
                >
                  Karta
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'transfer' && styles.paymentMethodButtonActive,
                ]}
                onPress={() => setPaymentMethod('transfer')}
              >
                <Text
                  style={[
                    styles.paymentMethodButtonText,
                    paymentMethod === 'transfer' && styles.paymentMethodButtonTextActive,
                  ]}
                >
                  O'tkazma
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Amount */}
          <View style={styles.paymentAmountContainer}>
            <Text style={styles.label}>
              💰 Mijoz bergan summa (so'm)
            </Text>
            <TextInput
              style={styles.paymentAmountInput}
              placeholder={`Jami: ${calculateTotal().toLocaleString('uz-UZ')} so'm`}
              value={paymentAmount}
              onChangeText={(text) => {
                // Only allow numbers and decimal point
                const cleaned = text.replace(/[^0-9.]/g, '');
                setPaymentAmount(cleaned);
              }}
              keyboardType="numeric"
            />
            
            {paymentAmount && parseFloat(paymentAmount) > 0 ? (
              <View style={styles.paymentInfoContainer}>
                {(() => {
                  const paymentAmountValue = parseFloat(paymentAmount) || 0;
                  const totalAmountValue = calculateTotal();
                  const difference = paymentAmountValue - totalAmountValue;
                  
                  if (difference > 0) {
                    // Customer paid more - show excess
                    return (
                      <View>
                        <View style={styles.paymentInfoRow}>
                          <Text style={styles.paymentInfoLabel}>Ortiqcha summa:</Text>
                          <Text style={[styles.paymentInfoValue, styles.paymentInfoExcess]}>
                            {difference.toLocaleString('uz-UZ')} so'm
                          </Text>
                        </View>
                        <View style={styles.excessActionContainer}>
                          <Text style={styles.excessActionLabel}>
                            Ortiqcha summa bilan nima qilish?
                          </Text>
                          <View style={styles.excessActionButtons}>
                            <TouchableOpacity
                              style={[
                                styles.excessActionButton,
                                excessAction === 'return' && styles.excessActionButtonActive,
                              ]}
                              onPress={() => setExcessAction('return')}
                            >
                              <Text
                                style={[
                                  styles.excessActionButtonText,
                                  excessAction === 'return' && styles.excessActionButtonTextActive,
                                ]}
                              >
                                💵 Qaytarish
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.excessActionButton,
                                excessAction === 'debt' && styles.excessActionButtonActive,
                              ]}
                              onPress={() => setExcessAction('debt')}
                            >
                              <Text
                                style={[
                                  styles.excessActionButtonText,
                                  excessAction === 'debt' && styles.excessActionButtonTextActive,
                                ]}
                              >
                                📝 Qarzdan ayirish
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  } else if (difference < 0) {
                    // Customer paid less - show debt
                    return (
                      <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentInfoLabel}>Yetmadi (qarzga yoziladi):</Text>
                        <Text style={[styles.paymentInfoValue, styles.paymentInfoDebt]}>
                          {Math.abs(difference).toLocaleString('uz-UZ')} so'm
                        </Text>
                      </View>
                    );
                  } else {
                    // Exact payment
                    return (
                      <View style={styles.paymentInfoRow}>
                        <Text style={[styles.paymentInfoValue, styles.paymentInfoExact]}>
                          ✅ To'liq to'landi
                        </Text>
                      </View>
                    );
                  }
                })()}
              </View>
            ) : null}
          </View>

          {/* Admin Approval */}
          <View style={styles.adminApprovalContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRequiresAdminApproval(!requiresAdminApproval)}
            >
              <View
                style={[
                  styles.checkbox,
                  requiresAdminApproval && styles.checkboxChecked,
                ]}
              >
                {requiresAdminApproval && <Text style={styles.checkboxCheckmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Admin ruxsati kerak</Text>
            </TouchableOpacity>
            {requiresAdminApproval && (
              <Text style={styles.adminApprovalHint}>
                Sotuv admin tasdiqlaguncha kutiladi
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Selected Products - Moved after Payment Section */}
      {selectedProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tanlangan mahsulotlar</Text>
          {selectedProducts.map((item) => (
            <View key={item.product_id} style={styles.selectedProductItem}>
              <View style={styles.selectedProductInfo}>
                <Text style={styles.selectedProductName}>{item.product_name}</Text>
                <Text style={styles.selectedProductPrice}>
                  {item.unit_price.toLocaleString('uz-UZ')} so'm x {item.requested_quantity}
                </Text>
              </View>
              <View style={styles.selectedProductActions}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.product_id, item.requested_quantity - 1)}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.requested_quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.product_id, item.requested_quantity + 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveProduct(item.product_id)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Jami:</Text>
            <Text style={styles.totalAmount}>
              {calculateTotal().toLocaleString('uz-UZ')} so'm
            </Text>
          </View>
        </View>
      )}

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Izoh</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Sotuv uchun izoh..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>


      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mijozni tanlang</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCustomerModal(false);
                  setCustomerSearchQuery('');
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              style={styles.searchInput}
              placeholder="Mijoz qidirish (ism yoki telefon)..."
              value={customerSearchQuery}
              onChangeText={(text) => {
                setCustomerSearchQuery(text);
                
                // Clear previous timeout
                if (searchTimeout) {
                  clearTimeout(searchTimeout);
                }
                
                // Debounce search - wait 300ms after user stops typing
                const timeout = setTimeout(() => {
                  loadCustomers(text);
                }, 300);
                
                setSearchTimeout(timeout);
              }}
            />

            {/* Customers List */}
            {isLoadingCustomers ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.customerListItem}
                    onPress={() => handleCustomerSelect(item)}
                  >
                    <View style={styles.customerListItemContent}>
                      <Text style={styles.customerListItemName}>{item.name}</Text>
                      {item.phone && (
                        <Text style={styles.customerListItemPhone}>📞 {item.phone}</Text>
                      )}
                      <Text style={styles.customerListItemType}>
                        {item.customer_type === 'wholesale'
                          ? 'Ulgurji'
                          : item.customer_type === 'retail'
                          ? 'Dona'
                          : 'Oddiy'}
                      </Text>
                    </View>
                    {customer?.id === item.id && (
                      <Text style={styles.selectedIndicator}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Mijozlar topilmadi</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
      </ScrollView>
      
      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />
      
      {/* Fixed Submit Button at Bottom */}
      <View style={[
        styles.fixedSubmitContainer,
        Platform.OS === 'web' && styles.fixedSubmitContainerWeb
      ]}>
        <TouchableOpacity
          style={[
            styles.submitButton, 
            isSubmitting && styles.submitButtonDisabled,
            (!customer || selectedProducts.length === 0) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !customer || selectedProducts.length === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {!customer 
                ? 'Mijozni tanlang' 
                : selectedProducts.length === 0 
                ? 'Mahsulot qo\'shing'
                : isEditMode
                ? 'Buyurtmani yangilash'
                : `Sotuvni yakunlash (${calculateTotal().toLocaleString('uz-UZ')} so'm)`
              }
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    position: 'relative',
    ...(Platform.OS === 'web' && {
      height: '100vh',
      overflow: 'hidden',
    }),
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewWeb: {
    // Web-specific: Force scroll to work
    height: '100%',
    maxHeight: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
    zIndex: 1,
    // Force hardware acceleration for smooth scrolling
    transform: 'translateZ(0)',
    willChange: 'scroll-position',
  },
  scrollViewContent: {
    paddingBottom: Platform.OS === 'ios' ? 180 : 160, // Space for fixed submit button + safe area
    flexGrow: 1,
    ...(Platform.OS !== 'web' && {
      minHeight: Dimensions.get('window').height,
    }),
  },
  scrollViewContentWeb: {
    // Web-specific: Ensure content is tall enough to scroll
    paddingBottom: 180,
    minHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    // Ensure content is visible
    width: '100%',
  },
  fixedSubmitContainer: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Safe area for iOS
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...(Platform.OS === 'web' 
      ? {
          boxShadow: '0 -2px 3px rgba(0, 0, 0, 0.1)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 5,
        }
    ),
    zIndex: 10,
  },
  fixedSubmitContainerWeb: {
    // Additional web-specific styles if needed
  },
  section: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  productsCount: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scannerButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    height: 44,
  },
  scannerButtonText: {
    fontSize: 20,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchButtonText: {
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: 'bold',
  },
  customerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customerButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  customerButtonIcon: {
    fontSize: 24,
    color: Colors.textLight,
  },
  customerDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
  },
  customerDetailText: {
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 4,
  },
  selectedProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 14,
    color: Colors.textLight,
  },
  selectedProductActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  loader: {
    padding: 40,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  productWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  productWrapperLeft: {
    paddingRight: 4,
  },
  productWrapperRight: {
    paddingLeft: 4,
  },
  productCard: {
    width: '100%',
  },
  emptyProductsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyProductsText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  pageInfoContainer: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  pageInfoText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 20,
    color: Colors.textDark,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalLoader: {
    padding: 40,
    alignItems: 'center',
  },
  customerListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  customerListItemContent: {
    flex: 1,
  },
  customerListItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  customerListItemPhone: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  customerListItemType: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  selectedIndicator: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  // Payment styles
  paymentMethodContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  paymentMethodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentMethodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentMethodButtonTextActive: {
    color: Colors.surface,
  },
  paymentAmountContainer: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentAmountInput: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: Colors.border,
    marginTop: 8,
  },
  paymentInfoContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '500',
  },
  paymentInfoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentInfoExcess: {
    color: Colors.info || '#0369a1',
  },
  paymentInfoDebt: {
    color: Colors.danger,
  },
  paymentInfoExact: {
    color: Colors.success,
    textAlign: 'center',
    width: '100%',
  },
  excessActionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  excessActionLabel: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 8,
  },
  excessActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  excessActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  excessActionButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  excessActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  excessActionButtonTextActive: {
    color: Colors.surface,
  },
  adminApprovalContainer: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxCheckmark: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '500',
  },
  adminApprovalHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 32,
    fontStyle: 'italic',
  },
  editModeBanner: {
    backgroundColor: Colors.primary + '20',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    alignItems: 'center',
  },
  editModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});

