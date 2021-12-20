import { useContext, useState } from 'react';
import { useAuth, useFirestore } from 'reactfire';
import moment from 'moment';
import PriorityPicker from './PriorityPicker';

// Contexts
import UserDataContext from '../../contexts/UserDataContext';

// Utilities
import { parsePeriodName, parsePeriodColor } from '../schedule/Periods';
import { AssignmentBlurb, updateAssignment, parseLabelColor } from './functions/SgyFunctions';
import { CheckSquare, Link, Square } from 'react-feather';
import AssignmentModal from './AssignmentModal';
import { shortify } from './functions/GeneralHelperFunctions';


// The assignment blocks for the Upcoming Tab
// Pretty self explanatory

export type ActiveItemState = {
    activeItem: AssignmentBlurb | null;
    setActiveItem: (item: AssignmentBlurb | null) => void;
}

type AssignmentTagProps = { label: string, color?: string };
export function AssignmentTag(props: AssignmentTagProps) {
    const {label, color} = props;

    return (
        <div className="assignment-tag">
            {color && <div style={{backgroundColor: color}} className="assignment-dot"/>}
            <div className="assignment-label">{label}</div>
        </div>
    )
}

export function AssignmentTags({item, period}: {item: AssignmentBlurb, period?: boolean}) {
    const userData = useContext(UserDataContext);

    return (
        <div className="assignment-tags">
            {period && (
                <AssignmentTag
                    label={parsePeriodName(item.period, userData)}
                    color={parsePeriodColor(item.period, userData)}
                />
            )}
            {item.labels.map(label => (
                <AssignmentTag key={label} label={label} color={parseLabelColor(label, userData)} />
            ))}
        </div>
    )
}

// the individual assignment
// TODO: instead of taking the assignment as `props.assignment`, would it be neater to take it spread out?
// ie. `props.name`, `props.link`, `props.timestamp`, with assignment passed in as `{...assignment}`
type AssignmentProps = { assignment: AssignmentBlurb } & ActiveItemState;
function Assignment(props: AssignmentProps) {
    const { assignment, setActiveItem } = props;

    const [modal, setModal] = useState(false);
    const userData = useContext(UserDataContext);
    const auth = useAuth();
    const firestore = useFirestore();

    const toggleCompleted = () => {
        updateAssignment({ ...assignment, completed: !assignment.completed }, userData, auth, firestore )
    }

    const setPriority = (priority: number) => {
        if(priority === assignment.priority) return;
        updateAssignment({ ...assignment, priority: priority }, userData, auth, firestore)
    }

    const isCustomAssignment = assignment.id.startsWith('W');

    const CompletedIcon = !assignment.completed ? Square : CheckSquare;

    return (
        <div 
            className="upcoming-assignment"
            onMouseEnter={() => setActiveItem(assignment)}
            onMouseLeave={() => setActiveItem(null)}
        >
            <div className="upcoming-assignment-content" onClick={() => setModal(!modal)}>
                <AssignmentTags item={assignment} period />
                <div className={"assignment-title"}>{shortify(assignment.name, 150)}</div>
                {assignment.description.length ? <div className={"upcoming-assignment-desc"}>{shortify(assignment.description,200)}</div> : null}
                <div className="assignment-due">
                    <div>
                        {assignment.timestamp!.format('hh:mm a on dddd, MMM Do')}
                    </div>
                </div> {/* TODO: include 24 hour support */}
            </div>
            <div className="upcoming-assignment-icons">
                <div className="upcoming-assignment-icons-top">
                    {!isCustomAssignment && <a href={assignment.link} target="_blank" rel="noopener noreferrer">
                        <Link size={28} color="var(--primary)" />
                    </a>}
                    <CompletedIcon
                        size={28}
                        style={{ marginLeft: 'auto', cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => toggleCompleted()}
                    />
                </div>

                <div className="upcoming-assignment-icons-bottom">
                    <PriorityPicker priority={assignment.priority} setPriority={setPriority} />
                </div>
            </div>

            <AssignmentModal item={assignment} open={modal} setOpen={setModal} />
        </div>
    )
}

// grouped by each day
type AssignmentDayProps = { day: moment.Moment, upcoming: AssignmentBlurb[] }
function AssignmentDay(props: AssignmentDayProps & ActiveItemState ) {
    const { day, upcoming, ...activeDayState } = props;
    return <>
        <div className="upcoming-day-header">
            {day.format('dddd, MMMM Do')} • In {day.diff(moment(), 'days') + 1} day{day.diff(moment(), 'days') ? 's' : ''}
        </div>

        {upcoming.map((assignment) => <Assignment key={assignment.id} assignment={assignment} {...activeDayState} />)}
    </>
}

// all assignments
type AssignmentsProps = { upcoming: AssignmentBlurb[] };
export default function Assignments(props: AssignmentsProps & ActiveItemState) {
    const { upcoming, ...activeDayState } = props;

    // We map days (like "11-29-2021") to all the assignments that are due on that day
    // that way we can have all the headers and stuff
    const daysMap = new Map<string, AssignmentBlurb[]>();
    for (const assignment of upcoming) {
        const day = assignment.timestamp!.format('MM-DD-YYYY');
        if (daysMap.has(day)) {
            daysMap.get(day)!.push(assignment);
        } else {
            daysMap.set(day, [assignment]);
        }
    }

    const days = [];
    for (const day of daysMap.keys()) {
        days.push({
            day: moment(day),
            upcoming: daysMap.get(day)!
        })
    }

    return (
        <div className="upcoming-assignments">
            {days.map(assignment =>
                <AssignmentDay
                    key={assignment.day.format('MM-DD-YYYY')}
                    {...assignment}
                    {...activeDayState}
                />
            )}
        </div>
    )
}
