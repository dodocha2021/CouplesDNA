const imgCircle = "/assets/icons/11da9b288e2465a390061fb49e53679248027edc.svg";

interface Component2Props {
    switch?: 'off' | 'on';
}

function Component2({ switch: switchState = "on" }: Component2Props) {
    return (
        <button className="box-border content-stretch cursor-pointer flex items-center justify-end p-[4px] relative rounded-2xl size-full" data-name="Switch=on" data-node-id="869:6987">
            <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-name="button-group" data-node-id="869:6978">
                <div className="[grid-area:1_/_1] bg-[#f7f9fb] ml-0 mt-0 rounded-2xl size-3" data-name="circle" data-node-id="869:6979"/>
            </div>
        </button>
    );
}

interface Pricing27Props {
    mobile?: 'false' | 'true';
}

function Pricing27({ mobile = "false" }: Pricing27Props) {
    const element = (
        <div className="flex flex-col font-['Inter:Semi_Bold',_sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-[16px] text-center text-nowrap">
            <p className="leading-[normal] whitespace-pre">FREE</p>
        </div>
    );
    
    const element1 = (
        <div className="flex flex-col font-['Inter:Semi_Bold',_sans-serif] font-semibold justify-center relative shrink-0 text-[32px]">
            <p className="leading-[normal] text-nowrap whitespace-pre">$0</p>
        </div>
    );
    
    const element2 = (
        <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center relative shrink-0 text-[16px]">
            <p className="leading-[22px] text-nowrap whitespace-pre">/month</p>
        </div>
    );
    
    const element3 = (
        <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0 w-full">
            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#ababab] text-[12px] text-nowrap">
                <p className="leading-[normal] whitespace-pre">Monthly</p>
            </div>
            <div className="bg-[#3a4f39] box-border content-stretch flex h-5 items-center justify-end p-[4px] relative rounded-2xl shrink-0 w-9" data-name="Component 2">
                <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-name="button-group">
                    <div className="[grid-area:1_/_1] bg-[#f7f9fb] ml-0 mt-0 rounded-2xl size-3" data-name="circle"/>
                </div>
            </div>
            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#3a4f39] text-[12px] text-nowrap">
                <p className="leading-[normal] whitespace-pre">Yearly</p>
            </div>
        </div>
    );
    
    const element4 = (
        <p className="leading-[normal]">It is a long established fact that a reader will be distracted.</p>
    );
    
    const element5 = (
        <div className="flex flex-col font-['Inter:Medium',_sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[18px] text-center text-nowrap">
            <p className="leading-[normal] whitespace-pre">Try now</p>
        </div>
    );
    
    const element6 = (
        <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0 w-full">
            <div className="overflow-clip relative shrink-0 size-6" data-name="Icon pack">
                <div className="absolute inset-[26.56%_15.45%_25.34%_15.45%]" data-name="Vector">
                    <img alt className="block max-w-none size-full" src={imgCircle}/>
                </div>
            </div>
            <div className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#3a4f39] text-[16px]">
                <p className="leading-[22px]">PNG templates</p>
            </div>
        </div>
    );
    
    const element7 = (
        <div className="content-stretch flex gap-2.5 items-center justify-start relative rounded-[18px] shrink-0 w-full">
            <div className="flex flex-col font-['Inter:Semi_Bold',_sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-[16px] text-center text-nowrap">
                <p className="leading-[normal] whitespace-pre">PREMIUM</p>
            </div>
        </div>
    );
    
    const element8 = (
        <div className="content-stretch flex items-center justify-start leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-nowrap w-full">
            <div className="flex flex-col font-['Inter:Semi_Bold',_sans-serif] font-semibold justify-center relative shrink-0 text-[32px]">
                <p className="leading-[normal] text-nowrap whitespace-pre">$99</p>
            </div>
            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center relative shrink-0 text-[16px]">
                <p className="leading-[22px] text-nowrap whitespace-pre">/month</p>
            </div>
        </div>
    );
    
    const element9 = (
        <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#ababab] text-[12px] text-nowrap">
            <p className="leading-[normal] whitespace-pre">Monthly</p>
        </div>
    );
    
    const element10 = (
        <p className="leading-[normal] whitespace-pre">Yearly</p>
    );
    
    const element11 = (
        <div className="content-stretch flex flex-col gap-4 items-start justify-start relative shrink-0 w-full">
            <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0 w-full">
                <div className="overflow-clip relative shrink-0 size-6" data-name="Icon pack">
                    <div className="absolute inset-[26.56%_15.45%_25.34%_15.45%]" data-name="Vector">
                        <img alt className="block max-w-none size-full" src={imgCircle}/>
                    </div>
                </div>
                <div className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#3a4f39] text-[16px]">
                    <p className="leading-[22px]">PNG templates</p>
                </div>
            </div>
            <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0 w-full">
                <div className="overflow-clip relative shrink-0 size-6" data-name="Icon pack">
                    <div className="absolute inset-[26.56%_15.45%_25.34%_15.45%]" data-name="Vector">
                        <img alt className="block max-w-none size-full" src={imgCircle}/>
                    </div>
                </div>
                <div className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[22px] min-h-px min-w-px not-italic relative shrink-0 text-[#3a4f39] text-[16px]">
                    <p className="mb-0">Figma responsive</p>
                    <p className>components</p>
                </div>
            </div>
        </div>
    );
    
    const element12 = (
        <div className="content-stretch flex gap-2.5 items-center justify-start relative rounded-[18px] shrink-0 w-full">
            <div className="flex flex-col font-['Inter:Semi_Bold',_sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-[16px] text-center text-nowrap">
                <p className="leading-[normal] whitespace-pre">PRO</p>
            </div>
        </div>
    );
    
    const element13 = (
        <div className="content-stretch flex items-center justify-start leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-nowrap w-full">
            <div className="flex flex-col font-['Inter:Semi_Bold',_sans-serif] font-semibold justify-center relative shrink-0 text-[32px]">
                <p className="leading-[normal] text-nowrap whitespace-pre">$199</p>
            </div>
            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center relative shrink-0 text-[16px]">
                <p className="leading-[22px] text-nowrap whitespace-pre">/month</p>
            </div>
        </div>
    );
    
    const element14 = (
        <div className="content-stretch flex flex-col gap-4 items-start justify-start relative shrink-0 w-full">
            <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0 w-full">
                <div className="overflow-clip relative shrink-0 size-6" data-name="Icon pack">
                    <div className="absolute inset-[26.56%_15.45%_25.34%_15.45%]" data-name="Vector">
                        <img alt className="block max-w-none size-full" src={imgCircle}/>
                    </div>
                </div>
                <div className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#3a4f39] text-[16px]">
                    <p className="leading-[22px]">PNG templates</p>
                </div>
            </div>
            <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0 w-full">
                <div className="overflow-clip relative shrink-0 size-6" data-name="Icon pack">
                    <div className="absolute inset-[26.56%_15.45%_25.34%_15.45%]" data-name="Vector">
                        <img alt className="block max-w-none size-full" src={imgCircle}/>
                    </div>
                </div>
                <div className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[22px] min-h-px min-w-px not-italic relative shrink-0 text-[#3a4f39] text-[16px]">
                    <p className="mb-0">Figma responsive</p>
                    <p className>components</p>
                </div>
            </div>
            <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0 w-full">
                <div className="overflow-clip relative shrink-0 size-6" data-name="Icon pack">
                    <div className="absolute inset-[26.56%_15.45%_25.34%_15.45%]" data-name="Vector">
                        <img alt className="block max-w-none size-full" src={imgCircle}/>
                    </div>
                </div>
                <div className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#3a4f39] text-[16px]">
                    <p className="leading-[22px]">Constant updates</p>
                </div>
            </div>
            <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0 w-full">
                <div className="overflow-clip relative shrink-0 size-6" data-name="Icon pack">
                    <div className="absolute inset-[26.56%_15.45%_25.34%_15.45%]" data-name="Vector">
                        <img alt className="block max-w-none size-full" src={imgCircle}/>
                    </div>
                </div>
                <div className="basis-0 font-['Inter:Regular',_sans-serif] font-normal grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#3a4f39] text-[16px]">
                    <p className="leading-[22px]">Constant templates</p>
                </div>
            </div>
        </div>
    );

    if (mobile === 'true') {
        return (
            <div className="bg-[#eff6f3] box-border content-stretch flex flex-col gap-6 items-center justify-start px-4 py-8 relative size-full" data-name="mobile=true" data-node-id="979:9885">
                <div className="content-stretch flex flex-col gap-11 items-start justify-start relative shrink-0 w-full" data-node-id="871:7798">
                    <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full" data-node-id="871:7799">
                        <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-6 items-start justify-start px-4 py-6 relative rounded-lg shrink-0 w-full" data-node-id="871:7800">
                            <div className="content-stretch flex gap-2.5 items-center justify-start relative rounded-[18px] shrink-0 w-[210px]" data-node-id="871:7801">
                                {element}
                            </div>
                            <div className="content-stretch flex items-center justify-start leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-nowrap" data-node-id="871:7803">
                                {element1}{element2}
                            </div>
                            {element3}
                            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] min-w-full not-italic relative shrink-0 text-[#2d2e2e] text-[12px]" data-node-id="871:7810" style={{ width: "min-content" }}>
                                {element4}
                            </div>
                            <div className="bg-[#3a4f39] box-border content-stretch flex gap-2.5 h-[51px] items-center justify-center px-[30px] py-[17px] relative rounded shrink-0 w-[140px]" data-name="Button" data-node-id="871:7811">
                                {element5}
                            </div>
                        </div>
                        {element6}
                    </div>
                    <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full" data-node-id="871:7815">
                        <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-6 items-start justify-start px-4 py-6 relative rounded-lg shrink-0 w-full" data-node-id="871:7816">
                            {element7}
                            {element8}
                            <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0 w-full" data-node-id="871:7822">
                                {element9}
                                <div className="bg-[#3a4f39] box-border content-stretch flex h-5 items-center justify-end p-[4px] relative rounded-2xl shrink-0 w-9" data-name="Component 2" data-node-id="871:7824">
                                    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-name="button-group" id="node-I871_7824-869_6978">
                                        <div className="[grid-area:1_/_1] bg-[#f7f9fb] ml-0 mt-0 rounded-2xl size-3" data-name="circle" id="node-I871_7824-869_6979"/>
                                    </div>
                                </div>
                                <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#3a4f39] text-[12px] text-nowrap" data-node-id="871:7825">
                                    {element10}
                                </div>
                            </div>
                            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] min-w-full not-italic relative shrink-0 text-[#2d2e2e] text-[12px]" data-node-id="871:7826" style={{ width: "min-content" }}>
                                {element4}
                            </div>
                            <div className="bg-[#3a4f39] box-border content-stretch flex gap-2.5 h-[51px] items-center justify-center px-[30px] py-[17px] relative rounded shrink-0 w-[140px]" data-name="Button" data-node-id="871:7827">
                                {element5}
                            </div>
                        </div>
                        {element11}
                    </div>
                    <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full" data-node-id="871:7835">
                        <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-6 items-start justify-start px-4 py-6 relative rounded-lg shrink-0 w-full" data-node-id="871:7836">
                            {element12}
                            {element13}
                            <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0 w-full" data-node-id="871:7842">
                                {element9}
                                <div className="bg-[#3a4f39] box-border content-stretch flex h-5 items-center justify-end p-[4px] relative rounded-2xl shrink-0 w-9" data-name="Component 2" data-node-id="871:7844">
                                    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0" data-name="button-group" id="node-I871_7844-869_6978">
                                        <div className="[grid-area:1_/_1] bg-[#f7f9fb] ml-0 mt-0 rounded-2xl size-3" data-name="circle" id="node-I871_7844-869_6979"/>
                                    </div>
                                </div>
                                <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#3a4f39] text-[12px] text-nowrap" data-node-id="871:7845">
                                    {element10}
                                </div>
                            </div>
                            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] min-w-full not-italic relative shrink-0 text-[#2d2e2e] text-[12px]" data-node-id="871:7846" style={{ width: "min-content" }}>
                                {element4}
                            </div>
                            <div className="bg-[#3a4f39] box-border content-stretch flex gap-2.5 h-[51px] items-center justify-center px-[30px] py-[17px] relative rounded shrink-0 w-[140px]" data-name="Button" data-node-id="871:7847">
                                {element5}
                            </div>
                        </div>
                        {element14}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-[#eff6f3] relative size-full" data-name="mobile=false" data-node-id="979:9884">
            <div className="absolute content-stretch flex gap-6 items-start justify-start left-1/2 translate-x-[-50%] translate-y-[-50%]" data-node-id="871:7651" style={{ top: "calc(50% + 0.5px)" }}>
                <div className="content-stretch flex flex-col gap-8 items-start justify-start relative shrink-0 w-[252px]" data-node-id="871:7652">
                    <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-6 items-start justify-start px-4 py-6 relative rounded-lg shrink-0 w-full" data-node-id="871:7653">
                        <div className="content-stretch flex gap-2.5 items-center justify-start relative rounded-[18px] shrink-0 w-full" data-node-id="871:7654">
                            {element}
                        </div>
                        <div className="content-stretch flex items-center justify-start leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-nowrap w-full" data-node-id="871:7657">
                            {element1}{element2}
                        </div>
                        {element3}
                        <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-[12px] w-full" data-node-id="871:7656">
                            {element4}
                        </div>
                        <div className="bg-[#3a4f39] box-border content-stretch flex gap-2.5 h-[51px] items-center justify-center px-[30px] py-[17px] relative rounded shrink-0 w-full" data-name="Button" data-node-id="871:7660">
                            {element5}
                        </div>
                    </div>
                    {element6}
                </div>
                <div className="content-stretch flex flex-col gap-8 items-start justify-start relative shrink-0 w-[252px]" data-node-id="871:7664">
                    <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-6 items-start justify-start px-4 py-6 relative rounded-lg shrink-0 w-full" data-node-id="871:7665">
                        {element7}
                        {element8}
                        <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0 w-full" data-node-id="871:7786">
                            {element9}
                            <div className="bg-[#3a4f39] box-border content-stretch flex h-5 items-center justify-end p-[4px] relative rounded-2xl shrink-0 w-9" data-name="Component 2" data-node-id="871:7788">
                                <Component2 />
                            </div>
                            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-[12px] text-nowrap" data-node-id="871:7789">
                                {element10}
                            </div>
                        </div>
                        <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-[12px] w-full" data-node-id="871:7668">
                            {element4}
                        </div>
                        <div className="bg-[#3a4f39] box-border content-stretch flex gap-2.5 h-[51px] items-center justify-center px-[30px] py-[17px] relative rounded shrink-0 w-full" data-name="Button" data-node-id="871:7672">
                            {element5}
                        </div>
                    </div>
                    {element11}
                </div>
                <div className="content-stretch flex flex-col gap-8 items-start justify-start relative shrink-0 w-[252px]" data-node-id="871:7680">
                    <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-6 items-start justify-start px-4 py-6 relative rounded-lg shrink-0 w-full" data-node-id="871:7681">
                        {element12}
                        {element13}
                        <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0 w-full" data-node-id="871:7792">
                            {element9}
                            <div className="bg-[#3a4f39] box-border content-stretch flex h-5 items-center justify-end p-[4px] relative rounded-2xl shrink-0 w-9" data-name="Component 2" data-node-id="871:7794">
                                <Component2 />
                            </div>
                            <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-[12px] text-nowrap" data-node-id="871:7795">
                                {element10}
                            </div>
                        </div>
                        <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#2d2e2e] text-[12px] w-full" data-node-id="871:7684">
                            {element4}
                        </div>
                        <div className="bg-[#3a4f39] box-border content-stretch flex gap-2.5 h-[51px] items-center justify-center px-[30px] py-[17px] relative rounded shrink-0 w-full" data-name="Button" data-node-id="871:7688">
                            {element5}
                        </div>
                    </div>
                    {element14}
                </div>
            </div>
        </div>
    );
}

export default function Pricing28() {
    return <div className data-name="pricing-27" data-node-id="979:9933"><Pricing27 /></div>;
}