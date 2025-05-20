import React, { useState } from 'react';
import { Text } from '@shopify/polaris';

export default function FaqSection() {
  const faqs = [
    {
      question: "What is the Bulk Product Uploading App?",
      answer: "The Bulk Product Uploading App allows you to easily import and export products across multiple eCommerce platforms, including Shopify, WooCommerce, Amazon, Walmart, Etsy, BigCommerce, and more. With our app, you can streamline your product management process and move data between platforms effortlessly."
    },
    {
      question: "Which platforms are supported for product import and export?",
      answer: "Our app supports the following platforms for product import and export:\n\n- Shopify\n- Amazon Seller\n- Walmart Seller\n- eBay Seller\n- AliExpress\n- WooCommerce\n- Wix Seller\n- Alibaba\n- Etsy\n- Squarespace\n- BigCommerce\n- Custom CSV"
    },
    {
      question: "How do I import products into my store?",
      answer: "To import products, select your desired platform (e.g., Shopify, Amazon, etc.), upload your CSV file containing the product details, and the app will automatically import the products to your store."
    },
    {
      question: "How do I export products from Shopify to other platforms?",
      answer: "To export your products from Shopify, simply select the desired platform (e.g., Amazon, eBay, etc.) and choose the export option. Our app will generate a CSV file that you can upload to the chosen platform."
    },
    {
      question: "What types of plans are available?",
      answer: "We offer multiple subscription plans to fit your needs:\n\nFREE: $0/month for 20 products import & export (Shopify, WooCommerce). Does not renew.\nSHOP PLAN: $9.99/month for 100 products import & export (Shopify, WooCommerce, Wix, BigCommerce, Squarespace). Renews monthly.\nWAREHOUSE PLAN: $14.99/month for 300 products import & export (Shopify, WooCommerce, Squarespace, Amazon, Alibaba, Custom Sheet). Renews monthly.\nFACTORY PLAN: $49.99/month for 1,000 products import & export (Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy). Includes priority support. Renews monthly.\nFRANCHISE PLAN: $129.99/month for 3,000 products import & export (Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy, eBay). Includes priority support. Renews monthly.\nCITADEL PLAN: $499.99/month for 50,000 products import & export (Shopify, WooCommerce, Wix, BigCommerce, Squarespace, Amazon, Alibaba, Custom Sheet, AliExpress, Etsy, eBay). Includes priority support. Renews monthly."
    },
    {
      question: "What is the difference between the plans?",
      answer: "The main differences between the plans are the number of products you can import/export and the platforms supported. Higher-tier plans allow for larger product imports and more platform integrations. Additionally, the Factory, Franchise, and Citadel plans include priority support."
    },
    {
      question: "Do I get support if I need help with the app?",
      answer: "Yes, we offer customer support through live chat and a support form. You can reach out for assistance with any issues you're facing. Our priority support is available for the Factory, Franchise, and Citadel plans."
    },
    {
      question: "What information do I need to provide for support?",
      answer: "For support, please provide your name, email ID, collaboration code, store password (for previous reasons), and a detailed message describing your issue."
    },
    {
      question: "What happens if I exceed the product limits of my plan?",
      answer: "If you exceed the product limits of your current plan, you will need to upgrade to a higher-tier plan that supports a larger number of products. You can easily upgrade your plan through your account settings."
    },
    {
      question: "Can I cancel my subscription at any time?",
      answer: "Yes, you can cancel your subscription at any time. If you are on a monthly-renewing plan, the cancellation will take effect after your current billing cycle ends."
    },
    {
      question: "How do I contact support?",
      answer: "You can contact support through our live chat feature or by filling out the support form available in the app. If you are using a Factory, Franchise, or Citadel plan, you'll have access to priority support."
    },
    {
      question: "What is the 'Custom CSV' option?",
      answer: "The 'Custom CSV' option allows you to import and export product data using your own custom CSV file format. This is ideal for businesses that have specific data structures or use multiple platforms outside of the standard integrations."
    }
  ];
  const [selectedFaq, setSelectedFaq] = useState(null);
  return (
    <div>
      {faqs.map((faq, idx) => {
        const isOpen = selectedFaq === idx;
        return (
          <div
            key={idx}
            style={{
              marginBottom: 12,
              background: isOpen ? '#fff' : '#F6F6F7',
              border: isOpen ? '1px solid #E3E3E3' : 'none',
              borderRadius: isOpen ? 8 : 5,
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s, background 0.2s, border 0.2s',
              boxShadow: isOpen ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
            }}
          >
            <button
              onClick={() => setSelectedFaq(isOpen ? null : idx)}
              aria-expanded={isOpen}
              aria-controls={`faq-${idx}`}
              style={{
                width: '100%',
                background: isOpen ? '#fff' : 'none',
                border: 'none',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 24px',
                cursor: 'pointer',
                color: '#202223',
                borderRadius: isOpen ? 8 : 12,
                transition: 'background 0.2s, border-radius 0.2s, padding 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = isOpen ? '#fff' : '#EFEFEF')}
              onMouseOut={e => (e.currentTarget.style.background = isOpen ? '#fff' : 'transparent')}
            >
              <Text variant="headingSm" fontWeight="bold" as="span" style={{ flex: 1, textAlign: 'left' }}>{faq.question}</Text>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 20,
                  width: 20,
                  transform: isOpen ? 'rotate(-90deg)' : 'rotate(90deg)',
                  transformOrigin: '50% 50%',
                  transition: 'transform 0.2s',
                  color: '#8C9196',
                  fontSize: 20,
                  marginLeft: 8,
                }}
              >
                &#8250;
              </span>
            </button>
            {isOpen && (
              <div
                style={{
                  padding: '12px 24px 18px 24px',
                  color: '#202223',
                  whiteSpace: 'pre-line',
                }}
              >
                <Text variant="bodyMd" as="div">{faq.answer}</Text>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 