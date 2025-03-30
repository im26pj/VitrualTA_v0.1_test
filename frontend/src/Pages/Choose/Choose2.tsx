import React from "react";
import { useNavigate } from "react-router-dom";

export const Choose = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen bg-[#6582d2] flex flex-col items-center justify-center">

      {/* 標題 */}
      <h1 className="font-[Kavoon] text-white text-8xl md:text-8xl">
        Virtual TA
      </h1>

      {/* 插圖區域 */}
      <div className="relative w-full max-w-screen-lg flex justify-between items-center">
        {/* 算盤圖片 */}
        <img
          className="w-48 md:w-60"
          src="..\..\..\..\public\pic\gummy-abacus 1.png" // 改成你的本地圖片路徑
          alt="Abacus"
        />
        <button
        className="bg-[#d9d9d9] text-black font-Inknut_Antiqua-Regular text-xl px-6 py-3 rounded-2xl shadow-md hover:bg-gray-400 mx-4"
        onClick={() => navigate("/signin")}
      >
        Entry
      </button>
        {/* 計算機圖片 */}
        <img
          className="w-48 md:w-60"
          src="..\..\..\..\public\pic\gummy-calculator 1.png" // 改成你的本地圖片路徑
          alt="Calculator"
        />
      </div>
    </div>
  );
};