import { PropertyData, CityData } from '@/types/realEstate';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface UINotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
  dismissible?: boolean;
}

export interface UIManagerState {
  isLoading: boolean;
  loadingMessage: string | null;
  notifications: UINotification[];
  currentModal: ModalType | null;
  modalData: unknown;
}

export type ModalType = 
  | 'city_selection'
  | 'property_browser'
  | 'property_details'
  | 'property_purchase'
  | 'portfolio'
  | 'set_rent'
  | 'rent_collection_summary'
  | 'real_estate_menu';

export interface UIManagerActions {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  showNotification: (notification: Omit<UINotification, 'id' | 'timestamp'>) => string;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;
}

export function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  duration: number = 3000
): UINotification {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    duration,
    timestamp: Date.now(),
    dismissible: true,
  };
}

export function createSuccessNotification(title: string, message: string): UINotification {
  return createNotification('success', title, message);
}

export function createErrorNotification(title: string, message: string): UINotification {
  return createNotification('error', title, message, 5000);
}

export function createWarningNotification(title: string, message: string): UINotification {
  return createNotification('warning', title, message, 4000);
}

export function createInfoNotification(title: string, message: string): UINotification {
  return createNotification('info', title, message);
}

export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'success':
      return '#22C55E';
    case 'error':
      return '#EF4444';
    case 'warning':
      return '#F59E0B';
    case 'info':
    default:
      return '#3B82F6';
  }
}

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'check-circle';
    case 'error':
      return 'x-circle';
    case 'warning':
      return 'alert-triangle';
    case 'info':
    default:
      return 'info';
  }
}

export interface RealEstateUICallbacks {
  onShowCitySelection: () => void;
  onShowPropertyBrowser: () => void;
  onShowPortfolio: () => void;
  onShowPropertyDetails: (property: PropertyData) => void;
  onShowRealEstateMenu: () => void;
}

export function createRealEstateUIManager(callbacks: Partial<RealEstateUICallbacks> = {}) {
  const showCitySelection = () => {
    console.log('[UIManager] Opening city selection');
    callbacks.onShowCitySelection?.();
  };

  const showPropertyBrowser = () => {
    console.log('[UIManager] Opening property browser');
    callbacks.onShowPropertyBrowser?.();
  };

  const showPortfolio = () => {
    console.log('[UIManager] Opening portfolio');
    callbacks.onShowPortfolio?.();
  };

  const showPropertyDetails = (property: PropertyData) => {
    console.log('[UIManager] Opening property details:', property.propertyId);
    callbacks.onShowPropertyDetails?.(property);
  };

  const showRealEstateMenu = () => {
    console.log('[UIManager] Opening real estate menu');
    callbacks.onShowRealEstateMenu?.();
  };

  return {
    showCitySelection,
    showPropertyBrowser,
    showPortfolio,
    showPropertyDetails,
    showRealEstateMenu,
  };
}

export function formatLoadingMessage(action: string): string {
  const messages: Record<string, string> = {
    purchase: 'Processing purchase...',
    rent_collection: 'Collecting rental income...',
    loading_properties: 'Loading properties...',
    saving: 'Saving changes...',
    city_selection: 'Loading city data...',
  };
  return messages[action] || 'Loading...';
}

export interface PropertyDetailsModalData {
  property: PropertyData;
  isOwned: boolean;
  isInWatchlist: boolean;
}

export interface PropertyPurchaseModalData {
  property: PropertyData;
  purchasePrice: number;
  closingCosts: number;
  totalAmount: number;
  playerBalance: number;
}

export interface SetRentModalData {
  property: PropertyData;
  currentRent: number;
  baseRent: number;
  minRent: number;
  maxRent: number;
}

export interface RentCollectionModalData {
  totalIncome: number;
  propertiesCount: number;
  averageIncome: number;
  collectionDate: string;
}

export function shouldShowCitySelectionFirst(hasSelectedCity: boolean): boolean {
  return !hasSelectedCity;
}

export function getNavigationTarget(hasSelectedCity: boolean): 'city_selection' | 'property_browser' {
  return hasSelectedCity ? 'property_browser' : 'city_selection';
}
