
import React, { useEffect, useRef, useState } from "react";
import "./Chatbot.css";

// ============================================================
// ELECTROHIRE CHATBOT
// ============================================================

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const QUICK_QUESTIONS = [
  "What are my skills?",
  "Show my projects",
  "What is my skill gap?",
  "Show my applications",
];

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hi! 👋 I'm your ElectroHire Assistant. How can I help you today?",
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  // ============================================================
  // FOCUS INPUT WHEN CHATBOT OPENS
  // ============================================================

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // ============================================================
  // GET LOGGED-IN USER ID
  // ============================================================

  const getUserId = () => {
    try {
      const storedUser = localStorage.getItem("user");
      const storedUserId = localStorage.getItem("user_id");

      console.log("Stored user:", storedUser);
      console.log("Stored user_id:", storedUserId);

      let userId = null;

      // --------------------------------------------------------
      // Try user object first
      // --------------------------------------------------------

      if (storedUser) {
        const userData = JSON.parse(storedUser);

        userId =
          userData?.user_id ??
          userData?.id ??
          userData?.userId ??
          userData?.student_id ??
          null;
      }

      // --------------------------------------------------------
      // Fallback to separate localStorage user_id
      // --------------------------------------------------------

      if (!userId && storedUserId) {
        userId = storedUserId;
      }

      if (!userId) {
        console.error("ElectroHire: User ID not found.");
        return null;
      }

      const numericUserId = Number(userId);

      if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        console.error("ElectroHire: Invalid User ID:", userId);
        return null;
      }

      // Keep user_id synchronized
      localStorage.setItem("user_id", String(numericUserId));

      console.log(
        "ElectroHire Chatbot - Logged-in User ID:",
        numericUserId
      );

      return numericUserId;
    } catch (error) {
      console.error(
        "ElectroHire: Could not read logged-in user:",
        error
      );

      return null;
    }
  };

  // ============================================================
  // SEND MESSAGE TO FASTAPI
  // ============================================================

  const sendMessage = async (question = null) => {
    const messageText = question !== null ? question : input;

    if (!messageText.trim() || isLoading) {
      return;
    }

    const userText = messageText.trim();

    // --------------------------------------------------------
    // Get logged-in user
    // --------------------------------------------------------

    const userId = getUserId();

    // --------------------------------------------------------
    // If user is not logged in
    // --------------------------------------------------------

    if (!userId) {
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: Date.now(),
          sender: "user",
          text: userText,
        },
        {
          id: Date.now() + 1,
          sender: "bot",
          text:
            "⚠️ Your login information could not be found. Please login again.",
        },
      ]);

      setInput("");
      return;
    }

    // --------------------------------------------------------
    // Add user's message immediately
    // --------------------------------------------------------

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        id: Date.now(),
        sender: "user",
        text: userText,
      },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const requestBody = {
        message: userText,

        // Main user identity used throughout ElectroHire
        user_id: userId,

        // Kept for compatibility with chatbot implementations
        // that use student_id.
        student_id: userId,
      };

      console.log("=================================");
      console.log("ElectroHire Chatbot Request");
      console.log("URL:", `${API_URL}/api/chat`);
      console.log("Body:", requestBody);
      console.log("=================================");

      // ------------------------------------------------------
      // SEND REQUEST
      // ------------------------------------------------------

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(requestBody),
      });

      console.log(
        "ElectroHire Chatbot HTTP Status:",
        response.status
      );

      // ------------------------------------------------------
      // READ RESPONSE
      // ------------------------------------------------------

      const responseText = await response.text();

      console.log(
        "ElectroHire Chatbot Raw Response:",
        responseText
      );

      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error(
          "Chatbot response was not valid JSON:",
          parseError
        );
      }

      // ------------------------------------------------------
      // BACKEND ERROR
      // ------------------------------------------------------

      if (!response.ok) {
        const backendMessage =
          data?.detail ||
          data?.message ||
          responseText ||
          `Backend returned HTTP ${response.status}`;

        throw new Error(backendMessage);
      }

      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      const botResponse =
        data?.response ||
        data?.message ||
        data?.answer ||
        data?.reply ||
        "Sorry, I could not understand your question.";

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: botResponse,
        },
      ]);
    } catch (error) {
      console.error(
        "================================="
      );
      console.error(
        "ElectroHire Chatbot Error:",
        error
      );
      console.error(
        "================================="
      );

      let errorText =
        "⚠️ I couldn't connect to ElectroHire right now.";

      // ------------------------------------------------------
      // More useful error messages
      // ------------------------------------------------------

      if (
        error?.message?.includes("Failed to fetch") ||
        error?.message?.includes("NetworkError")
      ) {
        errorText =
          "⚠️ I couldn't connect to the ElectroHire backend. Please make sure FastAPI is running on http://localhost:8000.";
      } else if (error?.message) {
        errorText =
          `⚠️ Chatbot backend error: ${error.message}`;
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: Date.now() + 2,
          sender: "bot",
          text: errorText,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // FORM SUBMIT
  // ============================================================

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  // ============================================================
  // QUICK QUESTION
  // ============================================================

  const handleQuickQuestion = (question) => {
    sendMessage(question);
  };

  // ============================================================
  // CLEAR CHAT
  // ============================================================

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: "bot",
        text:
          "Hi! 👋 I'm your ElectroHire Assistant. How can I help you today?",
      },
    ]);
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      {/* ======================================================
          FLOATING CHATBOT BUTTON
      ======================================================= */}

      {!isOpen && (
        <button
          type="button"
          className="chatbot-floating-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open ElectroHire Assistant"
          title="ElectroHire Assistant"
        >
          <span>🤖</span>
        </button>
      )}

      {/* ======================================================
          CHATBOT WINDOW
      ======================================================= */}

      {isOpen && (
        <div className="chatbot-window">

          {/* ==================================================
              HEADER
          =================================================== */}

          <div className="chatbot-header">

            <div className="chatbot-header-left">

              <div className="chatbot-avatar">
                🤖
              </div>

              <div className="chatbot-heading">

                <h3>
                  ElectroHire Assistant
                </h3>

                <p>
                  <span className="chatbot-online-dot"></span>
                  Online
                </p>

              </div>

            </div>

            <div className="chatbot-header-buttons">

              <button
                type="button"
                className="chatbot-header-button"
                onClick={clearChat}
                title="Clear chat"
                aria-label="Clear chat"
              >
                ↻
              </button>

              <button
                type="button"
                className="chatbot-header-button close"
                onClick={() => setIsOpen(false)}
                title="Close chatbot"
                aria-label="Close chatbot"
              >
                ×
              </button>

            </div>

          </div>

          {/* ==================================================
              MESSAGES
          =================================================== */}

          <div className="chatbot-messages">

            {messages.map((message) => (
              <div
                key={message.id}
                className={`chatbot-message-row ${
                  message.sender === "user"
                    ? "user-row"
                    : "bot-row"
                }`}
              >

                {message.sender === "bot" && (
                  <div className="chatbot-small-avatar">
                    🤖
                  </div>
                )}

                <div className="chatbot-message-wrapper">

                  <div
                    className={`chatbot-message-bubble ${
                      message.sender === "user"
                        ? "user-bubble"
                        : "bot-bubble"
                    }`}
                  >
                    {message.text}
                  </div>

                  <span className="chatbot-message-label">
                    {message.sender === "user"
                      ? "You"
                      : "ElectroHire"}
                  </span>

                </div>

              </div>
            ))}

            {/* ==================================================
                TYPING INDICATOR
            =================================================== */}

            {isLoading && (
              <div className="chatbot-message-row bot-row">

                <div className="chatbot-small-avatar">
                  🤖
                </div>

                <div className="chatbot-message-wrapper">

                  <div className="chatbot-message-bubble bot-bubble typing-bubble">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                </div>

              </div>
            )}

            <div ref={messagesEndRef}></div>

          </div>

          {/* ==================================================
              QUICK QUESTIONS
          =================================================== */}

          <div className="chatbot-quick-section">

            <p className="chatbot-quick-title">
              Quick questions
            </p>

            <div className="chatbot-quick-list">

              {QUICK_QUESTIONS.map((question) => (
                <button
                  type="button"
                  key={question}
                  className="chatbot-quick-button"
                  onClick={() =>
                    handleQuickQuestion(question)
                  }
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}

            </div>

          </div>

          {/* ==================================================
              INPUT
          =================================================== */}

          <form
            className="chatbot-input-area"
            onSubmit={handleSubmit}
          >

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder="Ask ElectroHire..."
              disabled={isLoading}
              autoComplete="off"
            />

            <button
              type="submit"
              className="chatbot-send-button"
              disabled={
                isLoading || !input.trim()
              }
              aria-label="Send message"
              title="Send"
            >
              ➤
            </button>

          </form>

        </div>
      )}
    </>
  );
}

export default Chatbot;
