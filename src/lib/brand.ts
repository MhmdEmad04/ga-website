export const brand={name:'Garbalia',phone:'01028673770',whatsapp:'201028673770'};
export const whatsappLink=(message:string)=>`https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(message)}`;
