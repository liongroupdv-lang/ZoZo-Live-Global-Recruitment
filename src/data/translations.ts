import type { CoinPackageOption, RolePosition } from '../types/recruitment';

export type Language = 'en' | 'bn';

export interface RoleCopy {
  role: RolePosition;
  scope: string;
  description: string;
  formSummary: string;
}

export const COIN_PACKAGE_OPTIONS: CoinPackageOption[] = ['$500', '$800', '$1,000'];

export interface RecruitmentCopy {
  languageBarLabel: string;
  nav: {
    positions: string;
    process: string;
    apply: string;
    downloadApp: string;
  };
  hero: {
    meta1: string;
    meta2: string;
    meta3: string;
    title: string;
    description: string;
    startCta: string;
    downloadCta: string;
    mapTitle: string;
    mapSubtitle: string;
    stats: {
      regionsLabel: string;
      regionsValue: string;
      rolesLabel: string;
      rolesValue: string;
      accessLabel: string;
      accessValue: string;
      appLabel: string;
    };
  };
  openRoles: {
    heading: string;
    subheading: string;
    applyPrefix: string;
    selectedPrefix: string;
    items: RoleCopy[];
  };
  process: {
    heading: string;
    subheading: string;
    steps: Array<{
      number: string;
      title: string;
      description: string;
    }>;
  };
  form: {
    headerBanner: string;
    formTitle: string;
    formDescription: string;
    progressLabel: string;
    sections: {
      personal: {
        title: string;
        subtitle: string;
      };
      professional: {
        title: string;
        subtitle: string;
      };
      cv: {
        title: string;
        subtitle: string;
      };
      download: {
        title: string;
        subtitle: string;
        button: string;
      };
    };
    questions: {
      name: {
        label: string;
        help: string;
        placeholder: string;
        errorRequired: string;
      };
      country: {
        label: string;
        help: string;
        placeholder: string;
        searchPlaceholder: string;
        emptySearch: string;
        errorRequired: string;
      };
      whatsapp: {
        label: string;
        help: string;
        placeholder: string;
        errorInvalid: string;
      };
      position: {
        label: string;
        help: string;
        errorRequired: string;
      };
      currentApp: {
        label: string;
        help: string;
        placeholder: string;
        errorRequired: string;
      };
      adminsCount: {
        label: string;
        help: string;
        placeholder: string;
        errorInvalid: string;
      };
      agenciesCountSuperAdmin: {
        label: string;
        help: string;
        placeholder: string;
        errorInvalid: string;
      };
      agenciesCountAdmin: {
        label: string;
        help: string;
        placeholder: string;
        errorInvalid: string;
      };
      coinPackage: {
        label: string;
        help: string;
        errorRequired: string;
      };
      workExperienceGeneral: {
        label: string;
        help: string;
        placeholder: string;
        errorRequired: string;
      };
      workExperienceCoinSeller: {
        label: string;
        help: string;
        placeholder: string;
        errorRequired: string;
      };
      cvFile: {
        label: string;
        help: string;
        dropTitle: string;
        dropHint: string;
        chooseButton: string;
        replaceButton: string;
        removeButton: string;
        securityNote: string;
        errorRequired: string;
        errorType: string;
        errorSize: string;
      };
    };
    downloadReminderLabel: string;
    submitButton: string;
    submittingButton: string;
    duplicateError: string;
    networkError: string;
    genericSubmitError: string;
  };
  confirmation: {
    title: string;
    message: string;
    applicantLabel: string;
    positionLabel: string;
    countryLabel: string;
    whatsappLabel: string;
    cvFileLabel: string;
    downloadCardTitle: string;
    downloadCardSubtitle: string;
    downloadCardButton: string;
    submitAnotherButton: string;
  };
  footer: {
    tagline: string;
    publicNotice: string;
  };
}

export const RECRUITMENT_COPY: Record<Language, RecruitmentCopy> = {
  en: {
    languageBarLabel: 'Portal Language',
    nav: {
      positions: 'Positions',
      process: 'How It Works',
      apply: 'Apply Now',
      downloadApp: 'Download ZoZo Live',
    },
    hero: {
      meta1: 'Official Global Recruitment',
      meta2: '249 Countries & Territories',
      meta3: 'No Sign-In Required',
      title: 'Join the Official ZoZo Live Global Recruitment Team',
      description:
        'We are recruiting experienced Super Admins, Admins, and Official Coin Sellers worldwide. Complete the custom bilingual application form and upload your CV securely without signing into any Google account.',
      startCta: 'Start Application',
      downloadCta: 'Download ZoZo Live',
      mapTitle: 'ZoZo Live International Network',
      mapSubtitle: 'Hiring across Asia, Middle East, Europe, Americas, and Africa',
      stats: {
        regionsLabel: 'Global Coverage',
        regionsValue: '249 Countries',
        rolesLabel: 'Open Positions',
        rolesValue: '3 Leadership Roles',
        accessLabel: 'Public Form',
        accessValue: 'No Sign-In Needed',
        appLabel: 'Official App',
      },
    },
    openRoles: {
      heading: 'Recruitment Positions',
      subheading:
        'Select the position that best aligns with your agency network, live platform leadership, or official coin distribution experience.',
      applyPrefix: 'Apply as',
      selectedPrefix: 'Selected:',
      items: [
        {
          role: 'Super Admin',
          scope: '01. Regional Leadership · Multi-Agency Network',
          description:
            'Lead multi-agency expansion across territories, coordinate sub-admins, and scale host onboarding on ZoZo Live.',
          formSummary: 'Manage partner agencies and oversee regional Admins across live markets.',
        },
        {
          role: 'Admin',
          scope: '02. Agency Operations · Host Coordination',
          description:
            'Build and support active agencies, onboard talented broadcasters, and ensure healthy daily streaming performance.',
          formSummary: 'Recruit broadcasters, support local agencies, and guide daily host activity.',
        },
        {
          role: 'Coin Seller',
          scope: '03. Official Coin Desk · VIP Top-Ups',
          description:
            'Provide verified, fast official coin top-up service for VIP users and broadcasters with clear monthly sales targets.',
          formSummary: 'Official coin distribution and verified VIP top-ups ($500–$1,000 tiers).',
        },
      ],
    },
    process: {
      heading: 'Three-Step Application Process',
      subheading:
        'A transparent, secure recruitment process built exclusively for ZoZo Live international partners.',
      steps: [
        {
          number: 'Step 01',
          title: 'Select Your Position & Country',
          description:
            'Choose your desired recruitment position and select your country with its national flag.',
        },
        {
          number: 'Step 02',
          title: 'Upload Your CV',
          description: 'Upload your CV securely in PDF, DOC or DOCX format.',
        },
        {
          number: 'Step 03',
          title: 'Application Confirmation',
          description:
            'After submitting your application, our recruitment team will contact you directly via WhatsApp as soon as possible.',
        },
      ],
    },
    form: {
      headerBanner: 'ZOZO LIVE OFFICIAL GLOBAL RECRUITMENT PORTAL',
      formTitle: 'Custom Global Recruitment Application',
      formDescription:
        'Only Super Admin, Admin, and Coin Seller roles · No email address required · Position-specific questions appear automatically.',
      progressLabel: 'Completed',
      sections: {
        personal: {
          title: '1. Applicant Information',
          subtitle: 'Provide your full name, select your country with its flag, and enter your WhatsApp number.',
        },
        professional: {
          title: '2. Position & Platform Experience',
          subtitle: 'Select your desired position to reveal the specific questions for your role.',
        },
        cv: {
          title: '3. CV Upload',
          subtitle: 'Upload your CV securely in PDF, DOC, or DOCX format (maximum 5 MB). No Google sign-in required.',
        },
        download: {
          title: '4. Official ZoZo Live App',
          subtitle: 'Download the official ZoZo Live app at https://download.zozolive.site/',
          button: 'Download ZoZo Live',
        },
      },
      questions: {
        name: {
          label: 'Full Name',
          help: 'Enter your complete full name.',
          placeholder: 'e.g., Tariq Rahman',
          errorRequired: 'Please enter your full name.',
        },
        country: {
          label: 'Country',
          help: 'Search by country name or browse the list with national flags.',
          placeholder: 'Search or select your country...',
          searchPlaceholder: 'Type your country name (e.g., Bangladesh, UAE, India)...',
          emptySearch: 'No matching country found.',
          errorRequired: 'Please select your country.',
        },
        whatsapp: {
          label: 'WhatsApp Number',
          help: 'Include your active WhatsApp number so our recruitment team can contact you directly.',
          placeholder: 'e.g., +880 1712 345678',
          errorInvalid: 'Please enter a valid WhatsApp number (at least 6 digits).',
        },
        position: {
          label: 'Application Position',
          help: 'Choose one position. Relevant role-specific questions will appear below.',
          errorRequired: 'Please select one application position.',
        },
        currentApp: {
          label: 'Currently Working Live App',
          help: 'Which live-streaming app are you currently working with? (Write "None" if new).',
          placeholder: 'e.g., Bigo Live, Poppo Live, Chamet, or None',
          errorRequired: 'Please enter your currently working live app (or "None").',
        },
        adminsCount: {
          label: 'How many Admins do you currently have?',
          help: 'Enter the number of Admins working under your supervision.',
          placeholder: 'e.g., 10',
          errorInvalid: 'Enter a whole number (0 or higher).',
        },
        agenciesCountSuperAdmin: {
          label: 'How many Agencies do you currently manage?',
          help: 'Enter the total number of live-streaming agencies you manage.',
          placeholder: 'e.g., 6',
          errorInvalid: 'Enter a whole number (0 or higher).',
        },
        agenciesCountAdmin: {
          label: 'How many Agencies do you currently have?',
          help: 'Enter the number of agencies you currently operate.',
          placeholder: 'e.g., 3',
          errorInvalid: 'Enter a whole number (0 or higher).',
        },
        coinPackage: {
          label: 'Select your preferred coin-selling package or target amount',
          help: 'Choose the target tier that fits your monthly coin distribution volume.',
          errorRequired: 'Please select a preferred coin-selling package ($500, $800, or $1,000).',
        },
        workExperienceGeneral: {
          label: 'Work Experience',
          help: 'Share how long you have worked in live-streaming operations and key highlights.',
          placeholder: 'e.g., 3 years managing host agencies and live talent growth...',
          errorRequired: 'Please describe your work experience.',
        },
        workExperienceCoinSeller: {
          label: 'Coin Selling Experience',
          help: 'Describe how long you have worked as a coin seller and your average monthly top-up volume.',
          placeholder: 'e.g., 2 years supplying verified official coins on Bigo / Poppo Live...',
          errorRequired: 'Please describe your coin selling experience.',
        },
        cvFile: {
          label: 'CV Upload (PDF, DOC, DOCX — Max 5 MB)',
          help: 'Accepted formats: .pdf, .doc, .docx · Maximum size: 5 MB.',
          dropTitle: 'Click to browse or drag and drop your CV file here',
          dropHint: 'PDF, DOC, or DOCX up to 5 MB',
          chooseButton: 'Select CV File',
          replaceButton: 'Replace File',
          removeButton: 'Remove',
          securityNote: 'Stored privately for authorized ZoZo Live leadership review only.',
          errorRequired: 'Please upload your CV in PDF, DOC, or DOCX format.',
          errorType: 'Invalid file format. Only PDF, DOC, or DOCX files are accepted.',
          errorSize: 'File exceeds the 5 MB size limit.',
        },
      },
      downloadReminderLabel: 'Official App Download:',
      submitButton: 'Submit Application',
      submittingButton: 'Submitting Application...',
      duplicateError:
        'This application has already been submitted. Please wait a moment before sending another.',
      networkError: 'Network error while submitting your application. Please try again.',
      genericSubmitError: 'Unable to submit your application. Please check all required fields.',
    },
    confirmation: {
      title: 'Application Submitted Successfully!',
      message:
        'After submitting your application, our recruitment team will contact you directly via WhatsApp as soon as possible.',
      applicantLabel: 'Full Name',
      positionLabel: 'Application Position',
      countryLabel: 'Country',
      whatsappLabel: 'WhatsApp Number',
      cvFileLabel: 'Uploaded CV',
      downloadCardTitle: 'Download Official ZoZo Live App',
      downloadCardSubtitle: 'Visit https://download.zozolive.site/',
      downloadCardButton: 'Download ZoZo Live',
      submitAnotherButton: 'Submit Another Application',
    },
    footer: {
      tagline: 'Official Global Recruitment Portal',
      publicNotice: 'Secure Private Storage · Zero Google Sign-In Required for Applicants',
    },
  },
  bn: {
    languageBarLabel: 'ভাষা নির্বাচন',
    nav: {
      positions: 'পদসমূহ',
      process: 'আবেদন প্রক্রিয়া',
      apply: 'আবেদন করুন',
      downloadApp: 'ZoZo Live ডাউনলোড',
    },
    hero: {
      meta1: 'অফিসিয়াল গ্লোবাল রিক্রুটমেন্ট',
      meta2: 'বিশ্বের সকল দেশ ও পতাকা',
      meta3: 'কোনো সাইন-ইন প্রয়োজন নেই',
      title: 'ZoZo Live অফিসিয়াল গ্লোবাল রিক্রুটমেন্ট টিমে যোগ দিন',
      description:
        'আমরা বিশ্বব্যাপী দক্ষ Super Admin, Admin এবং অফিসিয়াল Coin Seller নিয়োগ দিচ্ছি। কোনো গুগল অ্যাকাউন্টে লগইন ছাড়াই সরাসরি আমাদের কাস্টম আবেদন ফর্মটি পূরণ করে আপনার সিভি জমা দিন।',
      startCta: 'আবেদন শুরু করুন',
      downloadCta: 'ZoZo Live ডাউনলোড করুন',
      mapTitle: 'ZoZo Live আন্তর্জাতিক নেটওয়ার্ক',
      mapSubtitle: 'এশিয়া, মধ্যপ্রাচ্য, ইউরোপ, আমেরিকা এবং আফ্রিকাজুড়ে নিয়োগ চলছে',
      stats: {
        regionsLabel: 'আন্তর্জাতিক পরিসর',
        regionsValue: 'সকল দেশ উন্মুক্ত',
        rolesLabel: 'নিয়োগের পদ',
        rolesValue: '৩টি অফিসিয়াল পদ',
        accessLabel: 'আবেদন পদ্ধতি',
        accessValue: 'সাইন-ইন প্রয়োজন নেই',
        appLabel: 'অফিসিয়াল অ্যাপ',
      },
    },
    openRoles: {
      heading: 'নিয়োগের পদসমূহ',
      subheading:
        'আপনার এজেন্সি নেটওয়ার্ক, লাইভ প্ল্যাটফর্ম পরিচালনা অথবা কয়েন সেলিং অভিজ্ঞতার সাথে মানানসই পদটি বেছে নিন।',
      applyPrefix: 'আবেদন করুন:',
      selectedPrefix: 'নির্বাচিত:',
      items: [
        {
          role: 'Super Admin',
          scope: '০১. আঞ্চলিক নেতৃত্ব · মাল্টি-এজেন্সি নেটওয়ার্ক',
          description:
            'একাধিক এজেন্সি পরিচালনা করুন, আপনার অধীনস্থ Admin-দের সমন্বয় করুন এবং ZoZo Live-এর আঞ্চলিক প্রবৃদ্ধিতে নেতৃত্ব দিন।',
          formSummary: 'অধীনস্থ Admin ও একাধিক এজেন্সি পরিচালনার আঞ্চলিক নেতৃত্ব।',
        },
        {
          role: 'Admin',
          scope: '০২. এজেন্সি পরিচালনা · হোস্ট সমন্বয়',
          description:
            'সক্রিয় এজেন্সি পরিচালনা করুন, নতুন ও দক্ষ ব্রডকাস্টার যুক্ত করুন এবং দৈনিক লাইভ স্ট্রিমিং কার্যক্রম তদারকি করুন।',
          formSummary: 'হোস্ট রিক্রুটমেন্ট, এজেন্সি পরিচালনা এবং দৈনিক লাইভ সাপোর্ট।',
        },
        {
          role: 'Coin Seller',
          scope: '০৩. অফিসিয়াল কয়েন ডেস্ক · ভিআইপি টপ-আপ',
          description:
            'ভিআইপি ব্যবহারকারী ও হোস্টদের জন্য দ্রুত ও নিরাপদ অফিসিয়াল কয়েন সরবরাহ করুন এবং মাসিক টার্গেট পূরণ করুন।',
          formSummary: 'অফিসিয়াল কয়েন সেলিং ও ভেরিফাইড টপ-আপ ($500–$1,000 প্যাকেজ)।',
        },
      ],
    },
    process: {
      heading: 'তিন-ধাপের আবেদন প্রক্রিয়া',
      subheading:
        'ZoZo Live আন্তর্জাতিক রিক্রুটমেন্ট টিমের জন্য তৈরি নিরাপদ ও সহজ আবেদন প্রক্রিয়া।',
      steps: [
        {
          number: 'Step 01',
          title: 'আপনার পদ ও দেশ নির্বাচন করুন',
          description: 'আপনার কাঙ্ক্ষিত পদ নির্বাচন করুন এবং নিজ দেশের পতাকাসহ দেশটি বেছে নিন।',
        },
        {
          number: 'Step 02',
          title: 'আপনার সিভি আপলোড করুন',
          description: 'PDF, DOC অথবা DOCX ফরম্যাটে নিরাপদভাবে আপনার সিভি আপলোড করুন।',
        },
        {
          number: 'Step 03',
          title: 'আবেদন নিশ্চিতকরণ',
          description:
            'আবেদন জমা দেওয়ার সঙ্গে সঙ্গে আমাদের টিম দ্রুত WhatsApp-এর মাধ্যমে আপনার সঙ্গে যোগাযোগ করবে।',
        },
      ],
    },
    form: {
      headerBanner: 'ZOZO LIVE অফিসিয়াল গ্লোবাল রিক্রুটমেন্ট পোর্টাল',
      formTitle: 'অফিসিয়াল গ্লোবাল রিক্রুটমেন্ট আবেদন ফর্ম',
      formDescription:
        'শুধুমাত্র Super Admin, Admin এবং Coin Seller পদ · কোনো ইমেইল চাওয়া হবে না · নির্বাচিত পদের ওপর ভিত্তি করে প্রশ্ন দেখাবে।',
      progressLabel: 'সম্পন্ন',
      sections: {
        personal: {
          title: '১. আবেদনকারীর ব্যক্তিগত তথ্য',
          subtitle: 'আপনার পূর্ণ নাম, জাতীয় পতাকাসহ দেশ এবং সক্রিয় WhatsApp নম্বর প্রদান করুন।',
        },
        professional: {
          title: '২. পদ ও কাজের অভিজ্ঞতা',
          subtitle: 'আপনার পছন্দের পদ নির্বাচন করলে সেই পদের নির্দিষ্ট প্রশ্নসমূহ প্রদর্শিত হবে।',
        },
        cv: {
          title: '৩. সিভি (CV) আপলোড',
          subtitle: 'PDF, DOC অথবা DOCX ফরম্যাটে সর্বোচ্চ 5 MB আকারের সিভি আপলোড করুন। কোনো গুগল লগইন লাগবে না।',
        },
        download: {
          title: '৪. অফিসিয়াল ZoZo Live অ্যাপ',
          subtitle: 'https://download.zozolive.site/ থেকে অফিসিয়াল ZoZo Live অ্যাপ ডাউনলোড করুন।',
          button: 'ZoZo Live ডাউনলোড করুন',
        },
      },
      questions: {
        name: {
          label: 'পূর্ণ নাম (Full Name)',
          help: 'আপনার সম্পূর্ণ নাম লিখুন।',
          placeholder: 'যেমন: তারেক রহমান',
          errorRequired: 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।',
        },
        country: {
          label: 'দেশ (Country)',
          help: 'দেশের নাম লিখে সার্চ করুন অথবা পতাকাসহ তালিকা থেকে দেশ নির্বাচন করুন।',
          placeholder: 'আপনার দেশ খুঁজুন বা নির্বাচন করুন...',
          searchPlaceholder: 'দেশের নাম লিখুন (যেমন: Bangladesh, India, UAE)...',
          emptySearch: 'কোনো দেশ পাওয়া যায়নি।',
          errorRequired: 'অনুগ্রহ করে আপনার দেশ নির্বাচন করুন।',
        },
        whatsapp: {
          label: 'হোয়াটসঅ্যাপ নম্বর (WhatsApp Number)',
          help: 'আপনার সক্রিয় WhatsApp নম্বর দিন যাতে আমাদের টিম সরাসরি যোগাযোগ করতে পারে।',
          placeholder: 'যেমন: +880 1712 345678',
          errorInvalid: 'অনুগ্রহ করে সঠিক WhatsApp নম্বর লিখুন (কমপক্ষে ৬ ডিজিট)।',
        },
        position: {
          label: 'আবেদনের পদ (Application Position)',
          help: 'যেকোনো একটি পদ নির্বাচন করুন। নিচে সেই পদের জন্য নির্ধারিত প্রশ্ন দেখাবে।',
          errorRequired: 'অনুগ্রহ করে একটি পদ নির্বাচন করুন।',
        },
        currentApp: {
          label: 'বর্তমানে কোন Live App-এ কাজ করছেন?',
          help: 'আপনি বর্তমানে যে লাইভ অ্যাপে কাজ করছেন তার নাম লিখুন (নতুন হলে "None" লিখুন)।',
          placeholder: 'যেমন: Bigo Live, Poppo Live, Chamet, অথবা None',
          errorRequired: 'অনুগ্রহ করে বর্তমানে কাজ করা লাইভ অ্যাপের নাম লিখুন।',
        },
        adminsCount: {
          label: 'আপনার অধীনে বর্তমানে কতজন Admin রয়েছেন?',
          help: 'Super Admin হিসেবে আপনার অধীনে কাজ করা Admin সংখ্যা লিখুন।',
          placeholder: 'যেমন: 10',
          errorInvalid: '০ বা তার বেশি একটি পূর্ণসংখ্যা লিখুন।',
        },
        agenciesCountSuperAdmin: {
          label: 'আপনি বর্তমানে কতটি Agency পরিচালনা করছেন?',
          help: 'আপনার তত্ত্বাবধানে পরিচালিত মোট Agency-র সংখ্যা লিখুন।',
          placeholder: 'যেমন: 6',
          errorInvalid: '০ বা তার বেশি একটি পূর্ণসংখ্যা লিখুন।',
        },
        agenciesCountAdmin: {
          label: 'আপনার বর্তমানে কয়টি Agency রয়েছে?',
          help: 'আপনার অধীনে থাকা Agency সংখ্যা লিখুন।',
          placeholder: 'যেমন: 3',
          errorInvalid: '০ বা তার বেশি একটি পূর্ণসংখ্যা লিখুন।',
        },
        coinPackage: {
          label: 'আপনার পছন্দের কয়েন সেলিং প্যাকেজ বা টার্গেট পরিমাণ নির্বাচন করুন',
          help: 'আপনার মাসিক কয়েন সেলিং সক্ষমতা অনুযায়ী একটি টার্গেট প্যাকেজ বেছে নিন।',
          errorRequired: 'অনুগ্রহ করে একটি কয়েন সেলিং প্যাকেজ ($500, $800, বা $1,000) নির্বাচন করুন।',
        },
        workExperienceGeneral: {
          label: 'কাজের অভিজ্ঞতা (Work Experience)',
          help: 'লাইভ স্ট্রিমিং ইন্ডাস্ট্রিতে কতদিনের অভিজ্ঞতা রয়েছে তা বিস্তারিত লিখুন।',
          placeholder: 'যেমন: ৩ বছর ধরে লাইভ স্ট্রিমিং এজেন্সি ও হোস্ট পরিচালনার অভিজ্ঞতা...',
          errorRequired: 'অনুগ্রহ করে আপনার কাজের অভিজ্ঞতা লিখুন।',
        },
        workExperienceCoinSeller: {
          label: 'কয়েন সেলিং অভিজ্ঞতা (Coin Selling Experience)',
          help: 'কতদিন ধরে কয়েন সেলিং করছেন এবং মাসিক টপ-আপ অভিজ্ঞতা বিস্তারিত লিখুন।',
          placeholder: 'যেমন: ২ বছর ধরে বিভিন্ন লাইভ অ্যাপে অফিসিয়াল কয়েন সরবরাহের অভিজ্ঞতা...',
          errorRequired: 'অনুগ্রহ করে আপনার কয়েন সেলিং অভিজ্ঞতা লিখুন।',
        },
        cvFile: {
          label: 'সিভি আপলোড (PDF, DOC, DOCX — সর্বোচ্চ 5 MB)',
          help: 'সমর্থিত ফরম্যাট: .pdf, .doc, .docx · সর্বোচ্চ সাইজ: 5 MB।',
          dropTitle: 'সিভি নির্বাচন করতে ক্লিক করুন অথবা এখানে ফাইলটি ড্রপ করুন',
          dropHint: 'সর্বোচ্চ 5 MB পর্যন্ত PDF, DOC বা DOCX ফাইল',
          chooseButton: 'সিভি ফাইল নির্বাচন করুন',
          replaceButton: 'ফাইল পরিবর্তন করুন',
          removeButton: 'মুছে ফেলুন',
          securityNote: 'আপনার সিভি সম্পূর্ণ গোপনীয়ভাবে সংরক্ষিত থাকবে এবং শুধু অনুমোদিত কর্তৃপক্ষ দেখতে পারবে।',
          errorRequired: 'অনুগ্রহ করে PDF, DOC অথবা DOCX ফরম্যাটে আপনার সিভি আপলোড করুন।',
          errorType: 'ভুল ফাইল ফরম্যাট। শুধুমাত্র PDF, DOC অথবা DOCX ফাইল গ্রহণযোগ্য।',
          errorSize: 'ফাইলটির আকার 5 MB সীমা অতিক্রম করেছে।',
        },
      },
      downloadReminderLabel: 'অফিসিয়াল অ্যাপ ডাউনলোড:',
      submitButton: 'আবেদন জমা দিন',
      submittingButton: 'আবেদন জমা হচ্ছে...',
      duplicateError: 'এই আবেদনটি ইতোমধ্যে জমা হয়েছে। অনুগ্রহ করে একটু অপেক্ষা করুন।',
      networkError: 'নেটওয়ার্ক সমস্যার কারণে আবেদন জমা দেওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
      genericSubmitError: 'আবেদন জমা দেওয়া যায়নি। অনুগ্রহ করে সকল তথ্য সঠিকভাবে যাচাই করুন।',
    },
    confirmation: {
      title: 'আপনার আবেদন সফলভাবে জমা হয়েছে!',
      message:
        'আবেদন জমা দেওয়ার সঙ্গে সঙ্গে আমাদের টিম দ্রুত WhatsApp-এর মাধ্যমে আপনার সঙ্গে যোগাযোগ করবে।',
      applicantLabel: 'পূর্ণ নাম',
      positionLabel: 'আবেদনের পদ',
      countryLabel: 'দেশ',
      whatsappLabel: 'হোয়াটসঅ্যাপ নম্বর',
      cvFileLabel: 'আপলোডকৃত সিভি',
      downloadCardTitle: 'অফিসিয়াল ZoZo Live অ্যাপ ডাউনলোড করুন',
      downloadCardSubtitle: 'ভিজিট করুন: https://download.zozolive.site/',
      downloadCardButton: 'ZoZo Live ডাউনলোড করুন',
      submitAnotherButton: 'আরেকটি আবেদন জমা দিন',
    },
    footer: {
      tagline: 'অফিসিয়াল গ্লোবাল রিক্রুটমেন্ট পোর্টাল',
      publicNotice: 'নিরাপদ ও গোপনীয় সংরক্ষণ · আবেদনকারীর কোনো গুগল লগইন প্রয়োজন নেই',
    },
  },
};
