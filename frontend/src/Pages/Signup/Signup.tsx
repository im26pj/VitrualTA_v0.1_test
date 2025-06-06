import React, { JSX, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../../../api_servers";

export const SignUp = (): JSX.Element => {
  const navigate = useNavigate();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [checkpassword, setCheckPassword] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // 自動清除訊息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSignup = async () => {
    try {
      const data = await apiPost('/api/signup', { 
        fullname, 
        account, 
        password, 
        checkpassword, 
        email 
      });

      if (data.success) {
        setSuccess(true);
        setMessage('註冊成功！');
        setTimeout(() => {
          navigate("/signin");
        }, 3000);
      } else {
        setSuccess(false);
        setMessage(data.message || '註冊失敗');
      }
    } catch (err) {
      setSuccess(false);
      console.error('API error:', err);
      setMessage(err instanceof Error ? err.message : '伺服器錯誤，請稍後再試');
    }
  };

  return (
    <div className="bg-[#6683d2] flex justify-center items-center min-h-screen p-4">
      <div className="bg-white w-[95%] max-w-[1000px] rounded-[36px] p-4 md:p-6 lg:p-8 h-auto relative">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
          @keyframes centerShake {
            0%, 100% {
              transform: translateX(-50%) translateX(0);
            }
            10%, 30%, 50%, 70%, 90% {
              transform: translateX(-50%) translateX(-10px);
            }
            20%, 40%, 60%, 80% {
              transform: translateX(-50%) translateX(10px);
            }
          }
          .message-shake {
            animation: centerShake 0.8s cubic-bezier(.36,.07,.19,.97) both;
          }
        `}</style>
        <div className="grid grid-cols-1">
          <div className="space-y-4 md:space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
              <label className="text-black text-[16px] md:text-[20px] lg:text-[24px] font-medium font-Inknut_Antiqua-Regular whitespace-nowrap">Full Name:</label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="w-full md:w-[70%] h-12 md:h-12 lg:h-14 bg-[#d9d9d980] rounded-[28px] px-4 text-[14px] md:text-[16px]"
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
              <label className="text-black text-[16px] md:text-[20px] lg:text-[24px] font-medium font-Inknut_Antiqua-Regular whitespace-nowrap">Account:</label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full md:w-[70%] h-12 md:h-12 lg:h-14 bg-[#d9d9d980] rounded-[28px] px-4 text-[14px] md:text-[16px]"
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
              <label className="text-black text-[16px] md:text-[20px] lg:text-[24px] font-medium font-Inknut_Antiqua-Regular whitespace-nowrap">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full md:w-[70%] h-12 md:h-12 lg:h-14 bg-[#d9d9d980] rounded-[28px] px-4 text-[14px] md:text-[16px]"
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
              <label className="text-black text-[16px] md:text-[20px] lg:text-[24px] font-medium font-Inknut_Antiqua-Regular whitespace-nowrap">Check Password:</label>
              <input
                type="password"
                value={checkpassword}
                onChange={(e) => setCheckPassword(e.target.value)}
                className="w-full md:w-[70%] h-12 md:h-12 lg:h-14 bg-[#d9d9d980] rounded-[28px] px-4 text-[14px] md:text-[16px]"
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
              <label className="text-black text-[16px] md:text-[20px] lg:text-[24px] font-medium font-Inknut_Antiqua-Regular whitespace-nowrap">Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full md:w-[70%] h-12 md:h-12 lg:h-14 bg-[#d9d9d980] rounded-[28px] px-4 text-[14px] md:text-[16px]"
              />
            </div>

            {message && (
              <div className={`message-shake fixed top-[63%] md:top-[82%] left-1/2 -translate-x-1/2 z-50 text-center text-sm 
                ${success ? 'text-green-600' : 'text-red-700'} 
                bg-white bg-opacity-90 rounded p-2 shadow-lg min-w-[200px] flex items-center justify-center gap-2`}>
                {message}
                {success && (
                  <svg
                    className="w-5 h-5 text-green-600 animate-[fadeIn_0.5s_ease-in-out]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            )}

            <div className="flex items-center space-x-4 mt-4">
              <button
                onClick={handleSignup}
                className="w-full h-10 lg:h-20 bg-[#d9d9d9] rounded-[28px] text-black text-[20px] lg:text-[40px] font-medium hover:bg-gray-300 font-Inknut_Antiqua-Regular"
              >
                Sign up
              </button>

              <img
                className="w-[60%] md:w-[40%] max-w-[200px] h-auto"
                alt="Pixeltrue plan"
                src="/pic/pixeltrue-plan.png"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
