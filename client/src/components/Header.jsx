// client/src/components/Header.jsx

import React from 'react';
import './Header.css'; // Import CSS file for styling

function Header({ documentTitle, onSave }) {
  return (
    <div className="header">
      <div className="title">{documentTitle} </div>
      <button className="save-button" onClick={onSave}>Save</button>
      <div className="tools">
        {/* Add other relevant tools/buttons here */}
        <button className="tool-button">File</button>
        <button className="tool-button">Edit</button>
        <button className="tool-button">View</button>
        <button className="tool-button">Insert</button>
        <button className="tool-button">Format</button>
        <button className="tool-button">Tools</button>
        <button className="tool-button">Extensions</button>
        <button className="tool-button">Help</button>
      </div>
    </div>
  );
}

export default Header;
