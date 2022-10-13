import React, { useState } from "react";

const Form = () => {
  const [details, setDetails] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(e.target);

    setDetails({ name: "", email: "", message: "" });
  };
  const handleChange = (e) => {
    const { id, value } = e.target;

    setDetails({ ...details, [id]: value });
  };

  const { name, email, message } = details;

  return (
    <div className="mx-auto max-w-screen-xl px-4 pt-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Send us a Message!</h1>

        <p className="mt-4 text-gray-500">
          We'd love to hear from you and answer all of your questions. Just get
          in touch below.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-8 mb-0 max-w-md space-y-4 text-black"
      >
        <div>
          <label htmlFor="name" className="sr-only">
            Name
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-lg border-gray-200 p-4 pr-12 text-sm shadow-sm"
              placeholder="Your name"
              id="name"
              onChange={handleChange}
              value={name}
            />

            <span className="absolute inset-y-0 right-4 inline-flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                ></path>
              </svg>
            </span>
          </div>
        </div>
        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>

          <div className="relative">
            <input
              type="email"
              id="email"
              onChange={handleChange}
              value={email}
              className="w-full rounded-lg border-gray-200 p-4 pr-12 text-sm shadow-sm"
              placeholder="Your email"
            />

            <span className="absolute inset-y-0 right-4 inline-flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                ></path>
              </svg>
            </span>
          </div>
        </div>
        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>

          <div className="relative">
            <textarea
              className="w-full rounded-lg border-gray-200 p-4 pr-12 text-sm shadow-sm"
              placeholder="Your message"
              rows="10"
              id="message"
              onChange={handleChange}
              value={message}
            ></textarea>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="inline-block rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Form;
