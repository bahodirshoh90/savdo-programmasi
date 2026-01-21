/**
 * Language Context for Customer App
 * Provides multi-language support with Uzbek and Russian
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

// Translation dictionaries
const translations = {
  uz: {
    // Common
    loading: 'Yuklanmoqda...',
    error: 'Xatolik',
    success: 'Muvaffaqiyatli',
    cancel: 'Bekor qilish',
    confirm: 'Tasdiqlash',
    save: 'Saqlash',
    delete: 'O\'chirish',
    edit: 'Tahrirlash',
    search: 'Qidirish',
    filter: 'Filtr',
    sort: 'Tartiblash',
    all: 'Barchasi',
    
    // Navigation
    home: 'Bosh sahifa',
    products: 'Mahsulotlar',
    cart: 'Savatcha',
    orders: 'Buyurtmalar',
    profile: 'Profil',
    favorites: 'Sevimlilar',
    
    // Products
    productsList: 'Mahsulotlar ro\'yxati',
    productDetail: 'Mahsulot detallari',
    addToCart: 'Savatchaga qo\'shish',
    outOfStock: 'Omborda yo\'q',
    inStock: 'Omborda',
    price: 'Narx',
    brand: 'Brend',
    category: 'Kategoriya',
    reviews: 'Baholashlar',
    rating: 'Baholash',
    compare: 'Taqqoslash',
    
    // Cart
    cartItems: 'Savatchadagi mahsulotlar',
    quantity: 'Miqdor',
    total: 'Jami',
    checkout: 'Buyurtma berish',
    emptyCart: 'Savatcha bo\'sh',
    
    // Orders
    ordersList: 'Buyurtmalar ro\'yxati',
    orderDetail: 'Buyurtma detallari',
    orderNumber: 'Buyurtma raqami',
    orderStatus: 'Buyurtma holati',
    orderDate: 'Buyurtma sanasi',
    pending: 'Kutilmoqda',
    processing: 'Jarayonda',
    completed: 'Bajarildi',
    cancelled: 'Bekor qilindi',
    
    // Profile
    profileSettings: 'Profil sozlamalari',
    darkMode: 'Qorong\'u rejim',
    language: 'Til',
    logout: 'Chiqish',
    login: 'Kirish',
    
    // Reviews
    writeReview: 'Baholash yozish',
    ratingRequired: 'Baholash kerak',
    comment: 'Sharh',
    submit: 'Yuborish',
    helpful: 'Foydali',
    verifiedPurchase: 'Tasdiqlangan xarid',
  },
  ru: {
    // Common
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    save: 'Сохранить',
    delete: 'Удалить',
    edit: 'Редактировать',
    search: 'Поиск',
    filter: 'Фильтр',
    sort: 'Сортировка',
    all: 'Все',
    
    // Navigation
    home: 'Главная',
    products: 'Товары',
    cart: 'Корзина',
    orders: 'Заказы',
    profile: 'Профиль',
    favorites: 'Избранное',
    
    // Products
    productsList: 'Список товаров',
    productDetail: 'Детали товара',
    addToCart: 'В корзину',
    outOfStock: 'Нет в наличии',
    inStock: 'В наличии',
    price: 'Цена',
    brand: 'Бренд',
    category: 'Категория',
    reviews: 'Отзывы',
    rating: 'Рейтинг',
    compare: 'Сравнить',
    
    // Cart
    cartItems: 'Товары в корзине',
    quantity: 'Количество',
    total: 'Итого',
    checkout: 'Оформить заказ',
    emptyCart: 'Корзина пуста',
    
    // Orders
    ordersList: 'Список заказов',
    orderDetail: 'Детали заказа',
    orderNumber: 'Номер заказа',
    orderStatus: 'Статус заказа',
    orderDate: 'Дата заказа',
    pending: 'Ожидание',
    processing: 'В обработке',
    completed: 'Выполнено',
    cancelled: 'Отменено',
    
    // Profile
    profileSettings: 'Настройки профиля',
    darkMode: 'Тёмный режим',
    language: 'Язык',
    logout: 'Выйти',
    login: 'Войти',
    
    // Reviews
    writeReview: 'Написать отзыв',
    ratingRequired: 'Требуется рейтинг',
    comment: 'Комментарий',
    submit: 'Отправить',
    helpful: 'Полезно',
    verifiedPurchase: 'Подтвержденная покупка',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('uz');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && (savedLanguage === 'uz' || savedLanguage === 'ru')) {
        setLanguage(savedLanguage);
      } else {
        // Default to Uzbek
        setLanguage('uz');
      }
    } catch (error) {
      console.error('Error loading language:', error);
      setLanguage('uz'); // Default to Uzbek
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (lang) => {
    if (lang !== 'uz' && lang !== 'ru') {
      console.warn('Invalid language:', lang);
      return;
    }

    try {
      await AsyncStorage.setItem('app_language', lang);
      setLanguage(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key, params = {}) => {
    let translation = translations[language]?.[key] || key;
    
    // Replace parameters in translation
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param]);
    });
    
    return translation;
  };

  const value = {
    language,
    changeLanguage,
    t,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export default LanguageContext;
