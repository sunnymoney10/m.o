import {Model} from 'survey-core';
export function replyFlow(){return new Model({pages:[{name:'attendance',elements:[{type:'radiogroup',name:'rsvp',isRequired:true,choices:['Confirmed','Maybe','Declined']}]},{name:'contribution',visibleIf:"{rsvp} = 'Confirmed'",elements:[{type:'text',name:'dish'},{type:'text',name:'serves'},{type:'boolean',name:'reconfirm'}]}]})}
