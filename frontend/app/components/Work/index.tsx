"use client"
import Image from 'next/image';

interface workdata {
    imgSrc: string;
    heading: string;
    subheading: string;
    hiddenpara: string;
}

const workdata: workdata[] = [
    {
        imgSrc: '/images/Work/icon-one.svg',
        heading: 'Ask Questions',
        subheading: 'Easily ask questions related to university life, academics, and student resources at the Lebanese International University.',
        hiddenpara: 'Our AI model is designed to understand your academic questions and provide clear, personalized answers to help you navigate university life.',
    },
    {
        imgSrc: '/images/Work/icon-two.svg',
        heading: 'Free of Charge',
        subheading: 'Access all services at no cost! Our AI model is completely free to use for all students and faculty members.',
        hiddenpara: 'Access all services at no cost! This AI model is completely free to use for all students and faculty members.',
    },
    {
        imgSrc: '/images/Features/featureOne.svg',
        heading: 'AI Effectiveness & Security',
        subheading: 'Leverage the power of advanced AI to get accurate, and helpful answers.',
        hiddenpara: 'This model not only delivers personalized academic assistance but also follows the best security standards. User’s data will only be stored at session. After the user closes the session, all collected data will be deleted.',
    }
]


const Work = () => {
    return (
        <div>
            <div className='mx-auto max-w-7xl mt-16 px-6 mb-20 relative md:h-[50rem] ' id="features-section">
                <div className="radial-bgone hidden lg:block"></div>
                <div className='text-center mb-14'>
                    <h3 className='text-offwhite text-3xl md:text-5xl font-bold mb-3'>How it work</h3>
                    <p className='text-bluish md:text-lg font-normal leading-8'>Our personalized AI model helps you get answers to your academic and university life-related questions at the Lebanese International University.
                    <br /> Learn how this innovative solution works to provide tailored guidance through an interactive chat interface.
                    </p>
                </div>

                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-y-20 gap-x-5 mt-32'>

                    {workdata.map((items, i) => (
                        <div className='card-b p-8' key={i}>
                            <div className='work-img-bg rounded-full flex justify-center absolute p-6'>
                                <Image src={items.imgSrc} alt={items.imgSrc} width={44} height={44} />
                            </div>
                            <div>
                                <Image src={'/images/Work/bg-arrow.svg'} alt="arrow-bg" width={85} height={35} />
                            </div>
                            <h3 className='text-2xl text-offwhite font-semibold text-center mt-8'>{items.heading}</h3>
                            <p className='text-base font-normal text-bluish text-center mt-2'>{items.subheading}</p>
                            <span className="text-base font-normal m-0 text-bluish text-center hides">{items.hiddenpara}</span>
                        </div>
                    ))}

                </div>

            </div>
        </div>
    )
}

export default Work;
