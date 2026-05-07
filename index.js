import express from "express";
import dotenv from "dotenv";
import Transaction_model from "./models/transaction.js";
import { connect_to_db } from "./utils/db.js";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

dotenv.config();

const app = express();

const allowedOrigins = [
  ...(process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  "http://localhost:3000",
  "http://localhost:3001",
  "https://leaderboard.frontend.nest.net.np",
  "https://leaderboard-frontend-opal.vercel.app",
  "https://leaderboard-frontend-23pcdckgx-rishavadhikari4s-projects.vercel.app",
];

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

const leaderboard_updates_io = io.of("/socket/leaderboard_updates");

const connected_users = [];

leaderboard_updates_io.on("connection", (socket) => {
  connected_users.push(socket.id);
  console.log("New client connected", socket.id);

  socket.on("disconnect", () => {
    const index = connected_users.indexOf(socket.id);
    console.log("Client disconnected", socket.id);
    if (index !== -1) {
      connected_users.splice(index, 1);
    }
  });
});

const PORT = process.env.PORT || 4001;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Nest Nepal Leaderboard API");
});

app.post("/add_nest_invoice_payment", async (req, res) => {
  try {
    const { invoiceId, adminID, encryptionKey } = req.body;

    if (!invoiceId || !adminID) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!encryptionKey) {
      return res.status(400).json({ error: "Missing encryption key" });
    }

    if (encryptionKey !== process.env.NEST_WHMCS_ENCRYPTION) {
      return res.status(401).json({ error: "Invalid encryption key" });
    }

    const invoiceDataRequest = await fetch(
      `https://myaccount.nestwebhost.com/includes/api.php?timestamp=${Date.now()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "GetInvoice",
          identifier: process.env.NEST_WHMCS_IDENTIFIER,
          secret: process.env.NEST_WHMCS_SECRET,
          responsetype: "json",
          invoiceid: invoiceId,
        }),
      },
    );
    const invoiceData = await invoiceDataRequest.json();

    if (!invoiceDataRequest.ok) {
      return res.status(500).json({
        error: "Failed to fetch invoice data",
        message: invoiceData.message,
      });
    }

    const adminDataRequest = await fetch(
      `https://myaccount.nestwebhost.com/includes/api.php?timestamp=${Date.now()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "GetAdminUsers",
          identifier: process.env.NEST_WHMCS_IDENTIFIER,
          secret: process.env.NEST_WHMCS_SECRET,
          responsetype: "json",
        }),
      },
    );

    if (!adminDataRequest.ok) {
      return res.status(500).json({ error: "Failed to fetch admin data" });
    }

    const adminData = await adminDataRequest.json();

    const admin = adminData.admin_users.find((admin) => admin.id === adminID);

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const now = new Date();

    const nptOffsetMs = 5.75 * 60 * 60 * 1000;
    const nowInNPT = new Date(now.getTime() + nptOffsetMs);

    const closestTransaction = invoiceData.transactions.transaction.find(
      (transaction) => {
        const transactionDate = new Date(transaction.date);
        const diff = Math.abs(nowInNPT - transactionDate);
        return diff <= 60 * 1000;
      },
    );

    if (!closestTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction_entry = {
      invoice_id: invoiceId,
      source: "nest",
      admin_id: adminID,
      admin_name: admin.fullName,
      amount: closestTransaction.amountin,
    };

    const transaction = new Transaction_model(transaction_entry);

    await transaction.save();

    leaderboard_updates_io.emit("new_transaction", {
      invoice_id: invoiceId,
      source: "nest",
      admin_id: adminID,
      admin_name: admin.fullName,
      amount: closestTransaction.amountin,
      date: transaction.date,
    });

    return res.status(200).json({
      transaction: transaction,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error", message: error });
  }
});

app.post("/add_babal_invoice_payment", async (req, res) => {
  try {
    const { invoiceId, adminID, encryptionKey } = req.body;

    if (!invoiceId || !adminID) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!encryptionKey) {
      return res.status(400).json({ error: "Missing encryption key" });
    }

    if (encryptionKey !== process.env.BABAL_WHMCS_ENCRYPTION) {
      return res.status(401).json({ error: "Invalid encryption key" });
    }

    const invoiceDataRequest = await fetch(
      `https://clients.babal.host/includes/api.php?timestamp=${Date.now()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "GetInvoice",
          identifier: process.env.BABAL_WHMCS_IDENTIFIER,
          secret: process.env.BABAL_WHMCS_SECRET,
          responsetype: "json",
          invoiceid: invoiceId,
        }),
      },
    );
    const invoiceData = await invoiceDataRequest.json();

    if (!invoiceDataRequest.ok) {
      return res.status(500).json({
        error: "Failed to fetch invoice data",
        message: invoiceData.message,
      });
    }

    const adminDataRequest = await fetch(
      `https://clients.babal.host/includes/api.php?timestamp=${Date.now()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "GetAdminUsers",
          identifier: process.env.BABAL_WHMCS_IDENTIFIER,
          secret: process.env.BABAL_WHMCS_SECRET,
          responsetype: "json",
        }),
      },
    );

    if (!adminDataRequest.ok) {
      return res.status(500).json({ error: "Failed to fetch admin data" });
    }

    const adminData = await adminDataRequest.json();

    const admin = adminData.admin_users.find((admin) => admin.id === adminID);

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const now = new Date();

    const nptOffsetMs = 5.75 * 60 * 60 * 1000;
    const nowInNPT = new Date(now.getTime() + nptOffsetMs);

    const closestTransaction = invoiceData.transactions.transaction.find(
      (transaction) => {
        const transactionDate = new Date(transaction.date);
        const diff = Math.abs(nowInNPT - transactionDate);
        return diff <= 60 * 1000;
      },
    );

    if (!closestTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction_entry = {
      invoice_id: invoiceId,
      source: "babal",
      admin_id: adminID,
      admin_name: admin.fullName,
      amount: closestTransaction.amountin,
    };

    const transaction = new Transaction_model(transaction_entry);

    await transaction.save();

    leaderboard_updates_io.emit("new_transaction", {
      invoice_id: invoiceId,
      source: "babal",
      admin_id: adminID,
      admin_name: admin.fullName,
      amount: closestTransaction.amountin,
      date: transaction.date,
    });

    return res.status(200).json({
      transaction: transaction,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error", message: error });
  }
});

app.post("/add_sms_invoice_payment", async (req, res) => {
  try {
    const { invoiceId, adminId, encryptionKey } = req.body;

    if (!invoiceId || !adminId || !encryptionKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (encryptionKey !== process.env.SMS_ENCRYPTION) {
      return res.status(401).json({ error: "Invalid encryption key" });
    }

    const invoiceDataRequest = await fetch(
      `https://auth.nestsms.com/api/public/get-invoice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: process.env.SMS_SECRET,
          invoiceId: invoiceId,
        }),
      },
    );

    const invoiceData = await invoiceDataRequest.json();

    // Fix 1: was checking invoiceDataRequest.success (doesn't exist on Response object)
    // should check invoiceData.success like the API response structure shows
    if (!invoiceData.success) {
      return res.status(500).json({
        error: "Failed to fetch invoice data",
        message: invoiceData.message,
      });
    }

    const adminDataRequest = await fetch(
      `https://auth.nestsms.com/api/public/get-admins`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: process.env.SMS_SECRET,
        }),
      },
    );

    const adminData = await adminDataRequest.json();

    // Fix 2: same issue — check adminData.success, not adminDataRequest.success
    if (!adminData.success) {
      return res.status(500).json({ error: "Failed to fetch admin data" });
    }

    const admin = adminData.admins.find((admin) => admin.id === adminId);
    console.log(admin);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    console.log(invoiceData.invoices);
    if (invoiceData.invoices.status !== "paid") {
      return res.status(400).json({ error: "Invoice is not paid" });
    }

    const transaction_entry = {
      invoice_id: invoiceId,
      source: "sms",
      admin_id: adminId,
      admin_name: admin.full_name,
      amount: invoiceData.invoices.total,
    };

    const transaction = new Transaction_model(transaction_entry);
    await transaction.save();

    leaderboard_updates_io.emit("new_transaction", {
      invoice_id: invoiceId,
      source: "sms",
      admin_id: adminId,
      admin_name: admin.full_name,
      amount: invoiceData.invoices.total,
      date: transaction.date,
    });

    return res.status(200).json({
      transaction: transaction,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error", message: error });
  }
});

app.post("/get_today_invoice_payments", async (req, res) => {
  try {
    console.log("Received request for today's invoice payments");
    const { frontendEncryptionKey } = req.body;

    if (!frontendEncryptionKey) {
      return res.status(400).json({ error: "Missing encryption key" });
    }

    if (frontendEncryptionKey !== process.env.FRONTEND_ENCRYPTION) {
      return res.status(401).json({ error: "Invalid encryption key" });
    }

    const now = new Date();

    const NPT_OFFSET_MINUTES = 5 * 60 + 45;
    const nptNow = new Date(now.getTime() + NPT_OFFSET_MINUTES * 60 * 1000);

    const nptStart = new Date(
      nptNow.getFullYear(),
      nptNow.getMonth(),
      nptNow.getDate(),
    );
    const nptEnd = new Date(
      nptNow.getFullYear(),
      nptNow.getMonth(),
      nptNow.getDate() + 1,
    );

    const startOfDay = new Date(
      nptStart.getTime() - NPT_OFFSET_MINUTES * 60 * 1000,
    );
    const endOfDay = new Date(
      nptEnd.getTime() - NPT_OFFSET_MINUTES * 60 * 1000,
    );

    const transactions = await Transaction_model.find({
      date: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", message: error });
  }
});

app.post("/get_monthly_invoice_payments", async (req, res) => {
  try {
    console.log("Received request for monthly invoice payments");
    const { frontendEncryptionKey, year, month } = req.body;

    if (!frontendEncryptionKey) {
      return res.status(400).json({ error: "Missing encryption key" });
    }

    if (frontendEncryptionKey !== process.env.FRONTEND_ENCRYPTION) {
      return res.status(401).json({ error: "Invalid encryption key" });
    }

    const NPT_OFFSET_MINUTES = 5 * 60 + 45;
    const nptOffsetMs = NPT_OFFSET_MINUTES * 60 * 1000;
    const now = new Date();
    const nptNow = new Date(now.getTime() + nptOffsetMs);

    const resolvedYear =
      year != null ? Number(year) : Number(nptNow.getFullYear());
    const resolvedMonth =
      month != null ? Number(month) : Number(nptNow.getMonth() + 1);

    if (
      !Number.isInteger(resolvedYear) ||
      !Number.isInteger(resolvedMonth) ||
      resolvedMonth < 1 ||
      resolvedMonth > 12
    ) {
      return res.status(400).json({
        error: "Invalid month/year",
        message: "Pass month as 1-12 and year as integer",
      });
    }

    const monthIndex = resolvedMonth - 1;

    const nptStart = new Date(resolvedYear, monthIndex, 1);
    const nptEnd = new Date(resolvedYear, monthIndex + 1, 1);

    const startOfMonth = new Date(nptStart.getTime() - nptOffsetMs);
    const endOfMonth = new Date(nptEnd.getTime() - nptOffsetMs);

    const topAdmins = await Transaction_model.aggregate([
      {
        $match: {
          date: {
            $gte: startOfMonth,
            $lt: endOfMonth,
          },
        },
      },
      {
        $group: {
          _id: {
            admin_id: "$admin_id",
            admin_name: "$admin_name",
          },
          total_amount: { $sum: "$amount" },
          transaction_count: { $sum: 1 },
        },
      },
      { $sort: { total_amount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          admin_id: "$_id.admin_id",
          admin_name: "$_id.admin_name",
          total_amount: 1,
          transaction_count: 1,
        },
      },
    ]);

    res.status(200).json({
      month: resolvedMonth,
      year: resolvedYear,
      topAdmins,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", message: error });
  }
});

app.post("/get_data_between_date", async (req, res) => {
  try {
    const { startDate, endDate, frontendEncryptionKey } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!frontendEncryptionKey) {
      return res.status(400).json({ error: "Missing encryption key" });
    }

    if (frontendEncryptionKey !== process.env.FRONTEND_ENCRYPTION) {
      return res.status(401).json({ error: "Invalid encryption key" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const NPT_OFFSET_MINUTES = 5 * 60 + 45;

    const nptStart = new Date(start.getTime() + NPT_OFFSET_MINUTES * 60 * 1000);
    const nptEnd = new Date(end.getTime() + NPT_OFFSET_MINUTES * 60 * 1000);

    const transactions = await Transaction_model.find({
      date: {
        $gte: nptStart,
        $lt: nptEnd,
      },
    });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", message: error });
  }
});

app.post("/get_admins", async (req, res) => {
  try {
    const { frontendEncryptionKey } = req.body;

    if (!frontendEncryptionKey) {
      return res.status(400).json({ error: "Missing encryption key" });
    }

    if (frontendEncryptionKey !== process.env.FRONTEND_ENCRYPTION) {
      return res.status(401).json({ error: "Invalid encryption key" });
    }

    const adminDataRequest = await fetch(
      `https://myaccount.nestwebhost.com/includes/api.php?timestamp=${Date.now()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "GetAdminUsers",
          identifier: process.env.WHMCS_IDENTIFIER,
          secret: process.env.WHMCS_SECRET,
          responsetype: "json",
        }),
      },
    );

    if (!adminDataRequest.ok) {
      return res.status(500).json({ error: "Failed to fetch admin data" });
    }

    const adminData = await adminDataRequest.json();

    const filteredAdminData = adminData.admin_users.map((admin) => ({
      id: admin.id,
      fullName: admin.fullName,
    }));

    res.status(200).json(filteredAdminData);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", message: error });
  }
});

server.listen(PORT, () => {
  connect_to_db();
  console.log(`Server is running on http://localhost:${PORT}`);
});
