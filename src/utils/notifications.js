import toast from 'react-hot-toast';

const baseStyle = {
  borderRadius: '1rem', // Acorde a tu diseño rounded-[1rem]
  background: '#fff',
  color: '#1e293b',
  fontFamily: 'Outfit, sans-serif',
  border: '1px solid #e5e7eb',
  padding: '16px',
};

export const notifySuccess = (message) => {
  toast.success(message, {
    style: { ...baseStyle, border: '1px solid #87be00' },
    iconTheme: { primary: '#87be00', secondary: '#fff' },
  });
};

export const notifyError = (message) => {
  toast.error(message, {
    style: { ...baseStyle, border: '1px solid #ef4444' },
    iconTheme: { primary: '#ef4444', secondary: '#fff' },
  });
};