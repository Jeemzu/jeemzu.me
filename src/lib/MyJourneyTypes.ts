export type JourneyCardProps = {
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    milestoneLocation: string;
    milestoneTitle: string;
    milestoneTimeline: string;
    milestoneDescription: string;
    degrees: number;
};

export type JourneyCardModal = JourneyCardProps & { milestoneBullets: { [key: string]: string[] }; open?: boolean; handleClose?: (value: React.SetStateAction<boolean>) => void };
