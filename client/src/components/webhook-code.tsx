import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Code2 } from "lucide-react";

interface WebhookCodeProps {
  businessId: string;
}

export function WebhookCode({ businessId }: WebhookCodeProps) {
  const trackingCode = `
<!-- Add this before </body> -->
<script>
  // Initialize session data
  const SESSION = {
    siteId: '${businessId}',
    startTime: Date.now(),
    lastActive: Date.now(),
    deviceInfo: {
      browser: navigator.userAgent,
      os: navigator.platform,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      }
    },
    pageViews: [],
    clicks: [],
    navigationPath: []
  };

  // Track page view
  function recordPageView() {
    const pageView = {
      path: window.location.pathname,
      timestamp: Date.now(),
      timeSpent: 0,
      scrollDepth: 0,
      deviceInfo: SESSION.deviceInfo,
      location: { country: 'Unknown', region: 'Unknown' }
    };

    // Calculate scroll depth
    let maxScroll = 0;
    document.addEventListener('scroll', () => {
      const scrollPercent = 
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      maxScroll = Math.max(maxScroll, scrollPercent);
      pageView.scrollDepth = maxScroll;
    });

    // Update time spent
    const interval = setInterval(() => {
      pageView.timeSpent = Date.now() - pageView.timestamp;
    }, 1000);

    SESSION.pageViews.push(pageView);
    SESSION.navigationPath.push(pageView.path);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
      sendAnalytics();
    });
  }

  // Track clicks
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target instanceof HTMLElement) {
      SESSION.clicks.push({
        path: window.location.pathname,
        timestamp: Date.now(),
        elementId: target.id || '',
        elementText: target.innerText || '',
        position: {
          x: e.clientX,
          y: e.clientY
        }
      });
    }
  });

  // Send analytics data
  async function sendAnalytics() {
    try {
      // Record visit duration
      await fetch('${window.location.origin}/api/businesses/${businessId}/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: Math.round((Date.now() - SESSION.startTime) / 1000),
          source: document.referrer || 'direct'
        })
      });

      // Send detailed analytics
      await fetch('${window.location.origin}/api/businesses/${businessId}/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SESSION)
      });
    } catch (e) {
      console.error('Failed to send analytics:', e);
    }
  }

  // Start tracking
  recordPageView();
</script>`.trim();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Code2 className="h-4 w-4" />
          Tracking Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Website Tracking Code</DialogTitle>
        </DialogHeader>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-md">
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
            <code>{trackingCode}</code>
          </pre>
        </div>
        <p className="text-sm text-gray-500">
          Add this code to your website to track detailed analytics including page views, click events, and session data.
          This script will automatically track:
          - Page views and time spent on each page
          - Scroll depth tracking
          - Click events and interactions
          - Device and browser information
          - Navigation paths through your site
        </p>
      </DialogContent>
    </Dialog>
  );
}