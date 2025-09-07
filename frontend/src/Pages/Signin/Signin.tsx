import React, { JSX, useState, useEffect } from "react";
import { data, useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete } from "../../api_servers";
import { setAuthToken } from '../../utils/auth';

export const Signin = (): JSX.Element => {
  const navigate = useNavigate();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleNavigate = (path: string) => {
    navigate(path);
  };

 const handleSignin = async () => {
  try {
    if (!account.trim() || !password.trim()) {
      setMessage("請輸入帳號和密碼");
      return;
    }

    const response = await apiPost("/api/login", { account, password });

if (response.success) {
  setAuthToken(response.token); // 存 JWT token
  localStorage.setItem("user", JSON.stringify(response.user)); // 🚀 存 user
  setMessage("success:登入成功！");
  setTimeout(() => {
    handleNavigate("/second");
  }, 2000);
}
  } catch (err: any) {
    setMessage(err.message);
  }
};

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="bg-[#6582d2] flex flex-col lg:flex-row justify-around items-center w-full min-h-screen p-4">
      {/* Add Font Awesome CDN */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
      />

      {/* Message Toast with conditional styling */}
      {message && (
        <div className="fixed top-[20%] lg:top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`animate__animated animate__bounce bg-white bg-opacity-90 px-6 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2
            ${message.startsWith('success:') ? 'text-green-600' : 'text-red-700'}`}>
            {message.startsWith('success:') && (
              <i className="fas fa-check-circle text-green-600"></i>
            )}
            {message.startsWith('success:') ? message.substring(8) : message}
          </div>
        </div>
      )}
      
      {/* 字體設定 */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon {
              font-family: 'Kavoon', cursive;
          }
        `}
      </style>
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular {
            font-family: 'Inknut Antiqua', serif;
          }
        `}</style>

      {/* Header */}
      <div
        className="absolute top-4 left-4 font-kavoon text-white text-3xl cursor-pointer z-10"
        onClick={() => handleNavigate("/choose2")}
      >
        Virtual TA
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-6xl mx-auto gap-8 px-4">
        {/* Left Image */}
        <div className="hidden lg:flex relative flex-col items-center lg:items-start flex-1">
          <img
            className="mx-auto w-50 lg:w-[500px] h-auto"
            alt="Learning culture"
            src="/pic/learning-culture-vark-learning-styles.png"
          />
        </div>

        {/* Right form */}
        <div className="relative w-full max-w-lg lg:max-w-[600px] bg-[#b5d1e1] rounded-2xl shadow-lg p-6 mt-8 lg:mt-0 h-auto lg:h-[550px] flex-1">
          <div className="mb-10 mt-10">
            <label className="block text-lg font-medium text-black mb-2 font-Inknut_Antiqua-Regular">Account</label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full border-b-2 border-black bg-transparent outline-none text-lg p-2"
              placeholder="Enter your account"
            />
          </div>
          <div className="mb-10">
            <label className="block text-lg font-medium text-black mb-2 font-Inknut_Antiqua-Regular">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b-2 border-black bg-transparent outline-none text-lg p-2"
              placeholder="Enter your password"
            />
          </div>

          {/* 登入按鈕功能更新 */}
          <div className="space-y-4">
            <button
              className="relative z-20 w-full bg-gray-300 rounded-lg py-3 text-black text-xl font-semibold hover:bg-gray-400 font-Inknut_Antiqua-Regular"
              onClick={() => handleNavigate("/signup")}
            >
              Sign up
            </button>
            <button
              className="relative z-20 w-full bg-gray-300 rounded-lg py-3 text-black text-xl font-semibold hover:bg-gray-400 font-Inknut_Antiqua-Regular"
              onClick={handleSignin}
            >
              Sign in
            </button>
            <button
              className="relative z-20 w-full bg-gray-300 rounded-lg py-3 text-black text-xl font-semibold hover:bg-gray-400 font-Inknut_Antiqua-Regular"
              onClick={() => handleNavigate("/ChatsRoom12")}
            >
              Continue without signing in
            </button>
          </div>

          {/* 裝飾圖 */}
          <div className="absolute w-[520px] h-[450px] top-[215px] left-[50px] z-10 pointer-events-none">
            <img
              className="w-full h-full"
              alt="Gummy bedroom"
              src="/pic/gummy-bedroom1.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
