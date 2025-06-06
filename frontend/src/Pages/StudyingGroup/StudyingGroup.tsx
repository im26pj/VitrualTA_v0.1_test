import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken } from "../../utils/auth";

const GroupCard = ({ name, progress, onMove, onDelete, onClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="relative bg-[#b5d1e1] rounded-xl p-4 w-[150px] h-[150px] flex flex-col justify-between items-center cursor-pointer"
      onClick={onClick}
    >
      <div
        className="absolute top-2 right-2 text-black"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
      >
        ⋮
      </div>
      {progress !== undefined && (
        <div className="text-xl font-semibold mt-4">{progress}%</div>
      )}
      <div className="text-lg font-Inknut_Antiqua-Regular text-center mt-auto mb-2">{name}</div>
      {menuOpen && (
        <div className="absolute top-8 right-2 bg-white shadow-lg rounded text-sm z-30">
          <div
            className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onMove();
            }}
          >
            Move
          </div>
          <div
            className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Delete
          </div>
        </div>
      )}
    </div>
  );
};

export const StudyingGroup = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const [groups, setGroups] = useState([
    { name: "Group 1", progress: 60 },
    { name: "Group 2" },
    { name: "Group 3" },
    { name: "Group 4" },
  ]);

  const handleDropdownToggle = () => setShowDropdown(!showDropdown);

  const handleSignOut = () => {
    clearAuthToken();
    navigate('/signin');
  };

  const menuItems = [
    { label: "Account Management", path: "/member-area" },
    { label: "Learning System", path: "/chatroom" },
    { label: "Group Studying", path: "/studying-group" },
    { label: "Learning Outcomes Tracking", path: "/outcomes-tracking" },
    { label: "Setting Vtuber", path: "/setvtuber" },
    { label: "Sign Out", onClick: handleSignOut, className: "text-red-600" }
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setShowDropdown(false);
  };

  const handleAddGroup = () => {
    const code = prompt("Enter group code to join:");
    if (code) {
      setGroups([...groups, { name: `Joined Group (${code})` }]);
    }
  };

  const handleCreateGroup = () => {
    const name = prompt("Enter new group name:");
    if (name) {
      setGroups([...groups, { name }]);
    }
  };

  const handleMove = (index) => {
    alert(`Move ${groups[index].name}`);
  };

  const handleDelete = (index) => {
    const updated = groups.filter((_, i) => i !== index);
    setGroups(updated);
  };

  const handleGroupClick = (groupName) => {
    navigate(`/group/${encodeURIComponent(groupName)}`);
  };

  return (
    <div className="bg-[#6683d2] flex flex-col items-center w-full h-screen overflow-y-auto">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Kavoon&display=swap');
          .font-kavoon { font-family: 'Kavoon', cursive; }
          @import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;700&display=swap');
          .font-Inknut_Antiqua-Regular { font-family: 'Inknut Antiqua', serif; }

          /* Mobile scrollbar styles */
          @media (max-width: 768px) {
            ::-webkit-scrollbar {
              width: 0;
              background: transparent;
            }

            ::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.3);
              border-radius: 5px;
            }

            ::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.5);
            }

            /* Show scrollbar while scrolling */
            ::-webkit-scrollbar-thumb:active {
              width: 8px;
            }

            * {
              scrollbar-width: thin;
              scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
            }
          }

          /* Desktop scrollbar styles */
          @media (min-width: 769px) {
            ::-webkit-scrollbar {
              width: 10px;
            }
            
            ::-webkit-scrollbar-track {
              background: transparent;
            }
            
            ::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.3);
              border-radius: 5px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.5);
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="w-full relative z-10">
        <div className="w-full bg-[#B5D1E1] py-6 px-8 flex items-center shadow-md fixed top-0 left-0 right-0 rounded-b-[28px]">
          <div className="text-white text-3xl md:text-4xl font-kavoon cursor-pointer" onClick={() => handleNavigate("/second")}>Virtual TA</div>
          <div className="mx-6 hidden md:flex gap-4">
            <button className="bg-[#E3E3E3] px-4 py-2 rounded-lg font-Inknut_Antiqua-Regular" onClick={handleAddGroup}>Add Group</button>
            <button className="bg-[#E3E3E3] px-4 py-2 rounded-lg font-Inknut_Antiqua-Regular" onClick={handleCreateGroup}>Create Group</button>
          </div>
          <div className="ml-auto flex items-center gap-4 relative">
            <div className="text-white text-2xl md:text-4xl font-kavoon">Group</div>
            <div className="relative">
              <img
                className="w-[70px] h-[70px] object-cover cursor-pointer"
                alt="User Avatar"
                src="/pic/2021781015212021.png"
                onClick={handleDropdownToggle}
              />
              {showDropdown && (
                <div className="absolute top-[80px] right-0 w-64 bg-gray-300 rounded-lg shadow-md z-20">
                  <ul className="py-2">
                    {menuItems.map((item, i) => (
                      <li
                        key={i}
                        className={`px-6 py-3 text-black hover:bg-gray-400 cursor-pointer text-center font-Inknut_Antiqua-Regular ${item.className || ""}`}
                        onClick={() => item.onClick ? item.onClick() : handleNavigate(item.path)}
                      >
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile buttons */}
      <div className="md:hidden fixed top-[100px] left-0 right-0 z-10 flex justify-center gap-4 bg-[#B5D1E1] py-4 px-8 rounded-b-[28px]">
        <button className="bg-[#E3E3E3] px-4 py-2 rounded-lg font-Inknut_Antiqua-Regular" onClick={handleAddGroup}>Add Group</button>
        <button className="bg-[#E3E3E3] px-4 py-2 rounded-lg font-Inknut_Antiqua-Regular" onClick={handleCreateGroup}>Create Group</button>
      </div>

      <div className="pt-52 md:pt-40 w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center mx-auto">
        {groups.map((group, index) => (
          <GroupCard
            key={index}
            name={group.name}
            progress={group.progress}
            onMove={() => handleMove(index)}
            onDelete={() => handleDelete(index)}
            onClick={() => handleGroupClick(group.name)}
          />
        ))}
      </div>
    </div>
  );
};
