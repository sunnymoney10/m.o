import {requireChatGPTUser} from '../chatgpt-auth';
import Workspace from './workspace';
export const dynamic='force-dynamic';
export default async function Host(){await requireChatGPTUser('/host');return <Workspace/>}
