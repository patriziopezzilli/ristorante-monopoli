import { analytics } from './firebase';
import { logEvent } from 'firebase/analytics';
import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Track page views
  trackPageView(pageName: string) {
    logEvent(analytics, 'page_view', {
      page_title: pageName,
      page_location: window.location.href
    });
    this.incrementMetric('page_views');
  }

  // Track menu interactions
  trackMenuView(menuType: string) {
    logEvent(analytics, 'menu_view', {
      menu_type: menuType
    });
    this.incrementMetric('menu_views');
  }

  // Track contact form submissions
  trackContactFormSubmission() {
    logEvent(analytics, 'contact_form_submit');
    this.incrementMetric('contact_form_submissions');
  }

  // Track admin login
  trackAdminLogin() {
    logEvent(analytics, 'admin_login');
    this.incrementMetric('admin_logins');
  }

  // Track menu upload
  trackMenuUpload(fileName: string, fileSize: number) {
    logEvent(analytics, 'menu_upload', {
      file_name: fileName,
      file_size: fileSize
    });
    this.incrementMetric('menu_uploads');
  }

  // Track content editing
  trackContentEdit(section: string, action: 'create' | 'update' | 'delete') {
    logEvent(analytics, 'content_edit', {
      section: section,
      action: action
    });
    this.incrementMetric('content_edits');
  }

  // Track loyalty card interactions
  trackLoyaltyCardClick(type: 'google_pay' | 'apple_wallet') {
    logEvent(analytics, 'loyalty_card_click', {
      wallet_type: type
    });
    this.incrementMetric('loyalty_card_clicks');
  }

  // Track language switch
  trackLanguageSwitch(from: string, to: string) {
    logEvent(analytics, 'language_switch', {
      from_language: from,
      to_language: to
    });
    this.incrementMetric('language_switches');
  }

  // Increment metric counter in Firestore
  private async incrementMetric(metricName: string) {
    try {
      const metricRef = doc(db, 'analytics', 'metrics');
      await setDoc(metricRef, {
        [metricName]: increment(1)
      }, { merge: true });
    } catch (error) {
      console.warn('Failed to increment metric:', error);
    }
  }

  // Get metrics from Firestore
  async getMetrics() {
    try {
      const metricRef = doc(db, 'analytics', 'metrics');
      const metricSnap = await getDoc(metricRef);
      
      if (metricSnap.exists()) {
        return metricSnap.data();
      }
      
      return {
        page_views: 0,
        menu_views: 0,
        contact_form_submissions: 0,
        admin_logins: 0,
        menu_uploads: 0,
        content_edits: 0,
        loyalty_card_clicks: 0,
        language_switches: 0
      };
    } catch (error) {
      console.warn('Failed to get metrics:', error);
      return {
        page_views: 0,
        menu_views: 0,
        contact_form_submissions: 0,
        admin_logins: 0,
        menu_uploads: 0,
        content_edits: 0,
        loyalty_card_clicks: 0,
        language_switches: 0
      };
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();