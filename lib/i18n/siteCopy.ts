import { useLanguage, type Language } from "@/lib/preferences";

const en = {
  skipToContent: "Skip to main content",
  header: {
    descriptor: "Mission-Aware Disruption Response",
    sector: "Essential Logistics · North Eastern Region",
    languageLabel: "Language",
    textSizeLabel: "Text size",
    textSizeShort: "Text",
    decreaseText: "Decrease text size",
    defaultText: "Default text size",
    increaseText: "Increase text size",
    helpdesk: "Helpdesk",
  },
  status: {
    label: "Connectivity",
    basis: "Shows this device's network connection, not server status.",
    checking: { short: "Checking", long: "Checking connection" },
    online: { short: "Online", long: "Device online" },
    weak: { short: "Weak", long: "Weak connection" },
    offline: { short: "Offline", long: "Device offline" },
  },
  helpdesk: {
    title: "Helpdesk",
    emergency:
      "NIRNYAY is not an emergency service. If anyone is injured or in immediate danger, call 112, India's national emergency number.",
    emergencyAction: "Call 112",
    reporting:
      "To report a road, bridge or transport disruption, choose Report an Incident. A photo, your device location and the time help officers assess what you saw.",
    officers: "Officers with issued credentials sign in through the Officer / Control Portal.",
    close: "Close",
  },
  hero: {
    eyebrow: "North Eastern Region Logistics Coordination Platform",
    headlineLines: ["When transport conditions change,", "know what happens next."],
    summary:
      "NIRNYAY connects field evidence, transport-network conditions and essential logistics missions to support faster, explainable operational decisions.",
  },
  entry: {
    heading: "What do you need to do?",
    subheading: "Report what you see on the road, or coordinate the response as an authorized officer.",
    report: {
      title: "Report an Incident",
      subtitle: "Capture what you see",
      description:
        "Found a road, bridge or transport disruption? Submit what you observed, where it happened, and a photo when available.",
      noteTitle: "Built for intermittent connectivity.",
      noteBody: "Reports can be saved locally and synchronized when usable connectivity returns.",
      ctaLabel: "Report incident",
    },
    officer: {
      title: "Officer / Control Portal",
      subtitle: "Understand and coordinate the response",
      description:
        "Monitor incidents, verify evidence, assess mission impact and coordinate operational response across key arterial corridors.",
      noteTitle: "Authorized access.",
      noteBody: "For designated officers and logistics coordinators. Sign-in required.",
      ctaLabel: "Open control portal",
    },
  },
  connectivity: {
    title: "Designed for low-connectivity corridors",
    body: "Mountain corridors such as NH-29 lose coverage in valleys and cuttings. Field reporting is designed to save on the device first and synchronize when a usable connection returns.",
    storage: {
      basis: "Checks whether this browser allows on-device storage for queued reports.",
      checking: "Checking on-device storage",
      available: "On-device storage available (IndexedDB)",
      unavailable: "On-device storage unavailable in this browser",
    },
  },
  footer: {
    programme: "NIRNYAY · Smart India Hackathon 2026 · Problem Statement SIH26002 · Round-1 prototype",
    disclaimer: "Not an emergency service. In an emergency, call 112.",
  },
};

export type SiteCopy = typeof en;

const hi: SiteCopy = {
  skipToContent: "मुख्य सामग्री पर जाएँ",
  header: {
    descriptor: "मिशन-सजग व्यवधान प्रतिक्रिया",
    sector: "आवश्यक लॉजिस्टिक्स · पूर्वोत्तर क्षेत्र",
    languageLabel: "भाषा",
    textSizeLabel: "अक्षर आकार",
    textSizeShort: "अक्षर",
    decreaseText: "अक्षर छोटे करें",
    defaultText: "सामान्य अक्षर आकार",
    increaseText: "अक्षर बड़े करें",
    helpdesk: "सहायता",
  },
  status: {
    label: "कनेक्टिविटी",
    basis: "यह इस डिवाइस का नेटवर्क कनेक्शन दिखाता है, सर्वर की स्थिति नहीं।",
    checking: { short: "जाँच", long: "कनेक्शन की जाँच" },
    online: { short: "ऑनलाइन", long: "डिवाइस ऑनलाइन" },
    weak: { short: "कमज़ोर", long: "कमज़ोर कनेक्शन" },
    offline: { short: "ऑफ़लाइन", long: "डिवाइस ऑफ़लाइन" },
  },
  helpdesk: {
    title: "सहायता केंद्र",
    emergency:
      "NIRNYAY आपातकालीन सेवा नहीं है। यदि कोई घायल है या तत्काल खतरे में है, तो भारत के राष्ट्रीय आपातकालीन नंबर 112 पर कॉल करें।",
    emergencyAction: "112 पर कॉल करें",
    reporting:
      "सड़क, पुल या परिवहन व्यवधान की सूचना देने के लिए 'घटना की सूचना दें' चुनें। फ़ोटो, आपके डिवाइस का स्थान और समय अधिकारियों को आपकी देखी स्थिति का आकलन करने में मदद करते हैं।",
    officers: "जारी क्रेडेंशियल वाले अधिकारी 'अधिकारी / नियंत्रण पोर्टल' के माध्यम से साइन इन करते हैं।",
    close: "बंद करें",
  },
  hero: {
    eyebrow: "पूर्वोत्तर क्षेत्र लॉजिस्टिक्स समन्वय प्लेटफ़ॉर्म",
    headlineLines: ["जब परिवहन की स्थिति बदले,", "जानिए आगे क्या होगा।"],
    summary:
      "NIRNYAY क्षेत्र से मिले साक्ष्य, परिवहन-नेटवर्क की स्थिति और आवश्यक लॉजिस्टिक्स मिशनों को जोड़ता है, ताकि तेज़ और स्पष्ट कारणों वाले परिचालन निर्णय लिए जा सकें।",
  },
  entry: {
    heading: "आप क्या करना चाहते हैं?",
    subheading: "सड़क पर जो दिखे उसकी सूचना दें, या अधिकृत अधिकारी के रूप में प्रतिक्रिया का समन्वय करें।",
    report: {
      title: "घटना की सूचना दें",
      subtitle: "जो दिखे, उसे दर्ज करें",
      description:
        "सड़क, पुल या परिवहन में कोई व्यवधान दिखा? आपने क्या देखा, वह कहाँ हुआ, और उपलब्ध हो तो एक फ़ोटो भेजें।",
      noteTitle: "रुक-रुक कर मिलने वाली कनेक्टिविटी के लिए बनाया गया।",
      noteBody: "रिपोर्ट डिवाइस पर सहेजी जा सकती हैं और उपयोगी कनेक्टिविटी लौटने पर सिंक्रनाइज़ की जाती हैं।",
      ctaLabel: "घटना दर्ज करें",
    },
    officer: {
      title: "अधिकारी / नियंत्रण पोर्टल",
      subtitle: "प्रतिक्रिया को समझें और समन्वित करें",
      description:
        "घटनाओं की निगरानी करें, साक्ष्य सत्यापित करें, मिशन पर प्रभाव का आकलन करें और प्रमुख मार्ग-गलियारों पर परिचालन प्रतिक्रिया का समन्वय करें।",
      noteTitle: "अधिकृत पहुँच।",
      noteBody: "नामित अधिकारियों और लॉजिस्टिक्स समन्वयकों के लिए। साइन-इन आवश्यक है।",
      ctaLabel: "नियंत्रण पोर्टल खोलें",
    },
  },
  connectivity: {
    title: "कम कनेक्टिविटी वाले मार्गों के लिए डिज़ाइन",
    body: "NH-29 जैसे पहाड़ी मार्गों पर घाटियों और कटानों में नेटवर्क चला जाता है। फ़ील्ड रिपोर्टिंग पहले डिवाइस पर सहेजने और उपयोगी कनेक्शन लौटने पर सिंक्रनाइज़ करने के लिए डिज़ाइन की गई है।",
    storage: {
      basis: "जाँचता है कि यह ब्राउज़र कतारबद्ध रिपोर्टों के लिए डिवाइस पर स्टोरेज की अनुमति देता है या नहीं।",
      checking: "डिवाइस स्टोरेज की जाँच हो रही है",
      available: "डिवाइस पर स्टोरेज उपलब्ध (IndexedDB)",
      unavailable: "इस ब्राउज़र में डिवाइस स्टोरेज उपलब्ध नहीं",
    },
  },
  footer: {
    programme: "NIRNYAY · स्मार्ट इंडिया हैकाथॉन 2026 · समस्या कथन SIH26002 · राउंड-1 प्रोटोटाइप",
    disclaimer: "यह आपातकालीन सेवा नहीं है। आपात स्थिति में 112 पर कॉल करें।",
  },
};

const siteCopy: Record<Language, SiteCopy> = { en, hi };

export function useSiteCopy(): SiteCopy {
  return siteCopy[useLanguage()];
}
