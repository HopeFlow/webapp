import { FC } from "react";

const ErrorPreparingPage: FC = () => (
  <section className="hero bg-base-200 min-h-[60vh]">
    <div className="hero-content text-center">
      <div className="card bg-base-100 w-full max-w-lg shadow-2xl">
        <div className="card-body items-center space-y-6">
          <span className="badge badge-error badge-outline tracking-wide uppercase">
            Error
          </span>
          <h1 className="card-title text-3xl font-bold">
            Error Preparing Page
          </h1>
          <p className="text-base-content/70">
            We apologize for the inconvenience, please try again in a few
            minutes.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default ErrorPreparingPage;
