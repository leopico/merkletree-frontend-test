import { useEffect, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import keccak256 from "keccak256";
const { MerkleTree } = require("merkletreejs");
window.Buffer = window.Buffer || require("buffer").Buffer; //for buffer defined

const hostServer = process.env.REACT_APP_SERVER;
// console.log(hostServer);

function App() {
  const [whitelistedAddresses, setWhitelistedAddresses] = useState([]);
  const [root, setRoot] = useState("");
  const [deleteAddress, setDeleteAddress] = useState("");
  const [addresses, setAddresses] = useState([]); //store data
  const [newAddresses, setNewAddresses] = useState(""); // Store the newly entered addresses from input

  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${hostServer}/api/addresses`);
      setWhitelistedAddresses(response.data);
    } catch (error) {
      console.error("Error fetching or generating Excel:", error);
    }
  };

  useEffect(() => {
    // Set up a timer to refresh data every 60 seconds
    const refreshInterval = setInterval(() => {
      console.log("component is rendering");
      fetchAddresses();
    }, 60000);

    // Clean up the timer when the component unmounts
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const readFile = async () => {
    try {
      const data = whitelistedAddresses;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Insert all addresses into a single column
      data.forEach((address, index) => {
        worksheet.getCell(index + 1, 1).value = address;
      });

      // Generate a Blob object containing the workbook in Excel format
      const blob = await workbook.xlsx.writeBuffer();

      // Create a URL for the Blob
      const url = window.URL.createObjectURL(new Blob([blob]));

      // Create a link element and trigger the download
      const a = document.createElement("a");
      a.href = url;
      a.download = "addresses.xlsx";
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error fetching or generating Excel:", error);
    }
  };

  const readHashRoot = () => {
    axios
      .get(`${hostServer}/api/gethashroot`)
      .then((response) => {
        setRoot(response.data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  };

  const deleteAll = () => {
    axios
      .delete(`${hostServer}/api/addresses`)
      .then(() => {
        console.log("deleted successfully!");
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  };

  const deleteCustom = async () => {
    try {
      // Delete the address on the backend
      await axios.delete(`${hostServer}/api/address/${deleteAddress}`);
      setDeleteAddress("");
      console.log("Deleted successfully");
    } catch (error) {
      if (error.response) {
        // The request was made, but the server responded with an error status code
        console.error(
          "Server Error:",
          error.response.status,
          error.response.data
        );
        // You can display an error message to the user based on the error.response.data
      } else if (error.request) {
        // The request was made, but no response was received (e.g., network error)
        console.error("Network Error:", error.request);
        // You can display a network error message to the user
      } else {
        // Something happened in setting up the request or processing the response
        console.error("Request Error:", error.message);
        // You can display a general error message to the user
      }
    }
  };

  //start adding address
  const addAddresses = () => {
    if (newAddresses.trim() !== "") {
      const addressesToAdd = newAddresses
        .split(",")
        .map((address) => address.trim());
      setAddresses([...addresses, ...addressesToAdd]);
      setNewAddresses(""); // Clear the input field after adding addresses
    }
  };

  const sendAddresses = () => {
    // Create the JSON structure with the addresses array
    const dataToSend = {
      addresses: addresses,
    }; //forming data to send backend

    // Send the data to your server
    axios
      .post(`${hostServer}/api/addresses`, dataToSend)
      .then((response) => {
        console.log("Addresses added successfully:", response.data);
        setAddresses([]);
      })
      .catch((error) => {
        console.error("Error adding addresses:", error);
      });
  };

  const removeAddress = (indexToRemove) => {
    // Create a new array without the address to be removed
    const updatedAddresses = addresses.filter(
      (_, index) => index !== indexToRemove
    );
    setAddresses(updatedAddresses);
  };
  //end adding address

  const mintHandler = () => {
    try {
      const leafNode = whitelistedAddresses.map((x) => keccak256(x));
      const tree = new MerkleTree(leafNode, keccak256, {
        //to backend
        sortPairs: true,
      });
      const buf2hex = (x) => "0x" + x.toString("hex");
      const leaf = keccak256("0xAa50815BFbd006836395C56A5C1046390b53f5d8");
      const proof = tree.getProof(leaf).map((x) => buf2hex(x.data));
      console.log(proof);
    } catch (error) {
      console.error("Error fetching error:", error);
    }
  };

  return (
    <div>
      <button onClick={readFile}>Download addresses</button>
      <br />
      <div>
        <input
          value={deleteAddress}
          type="text"
          placeholder="enter one address"
          onChange={(e) => setDeleteAddress(e.target.value)}
        />
        <button onClick={deleteCustom}>delete custom</button>
      </div>
      <br />
      <button onClick={readHashRoot}>get hashroot</button>
      <br />
      <button onClick={mintHandler}>Mint NFT</button>
      <br />
      <button onClick={deleteAll}>delete all</button>
      <br />
      <div>
        <div>
          <input
            type="text"
            placeholder="Enter addresses (comma-separated)"
            value={newAddresses}
            onChange={(e) => setNewAddresses(e.target.value)}
          />
          <button onClick={addAddresses}>Add Addresses</button>
        </div>
        <div>
          <ul>
            {addresses.map((address, index) => (
              <li key={index}>
                {address}{" "}
                <button onClick={() => removeAddress(index)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <button onClick={sendAddresses}>Send Addresses</button>
        </div>
      </div>
      <span>{root}</span>
    </div>
  );
}

export default App;
