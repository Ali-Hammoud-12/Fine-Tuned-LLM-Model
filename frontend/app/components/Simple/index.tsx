import Link from "next/link";

const Simple = () => {
  return (
    <div className="simple-bg relative">
      <div className="simpleone"></div>
      <div className="simpletwo"></div>
      <div className="simplethree"></div>
      <div className="simplefour"></div>
      <div className="simplefive"></div>
      <div className="mx-auto max-w-5xl py-24 px-6">
        <h3 className="text-center text-offwhite text-3xl lg:text-5xl font-semibold mb-6">
          A simple, secure way to ask questions and get answers <br /> about
          university life and academics
        </h3>
        <p className="text-center text-bluish text-lg font-normal mb-8">
          Our AI-powered platform helps you easily find personalized answers{" "}
          <br /> to a wide range of academic and university-related questions at
          the Lebanese International University.
        </p>
        <div className="flex justify-center ">
          <Link href="/chatbot">

            <button className="text-xl font-semibold text-white py-4 px-6 lg:px-12 navbutton">
              Get Started
            </button>
          </Link>
        </div>
      </div>
      <div className="simplesix"></div>
      <div className="simpleseven"></div>
      <div className="simpleeight"></div>
      <div className="simplenine"></div>
      <div className="simpleten"></div>
    </div>
  );
};

export default Simple;
