import {Dexie,type Table} from 'dexie';
export type HostDraft={id:string;data:any;version:number;updated:string};
class DraftDB extends Dexie{drafts!:Table<HostDraft,string>;constructor(){super('mo-host-drafts-v1');this.version(1).stores({drafts:'id'})}}
let db:DraftDB|undefined;
export function draftDB(){return db||(db=new DraftDB())}
