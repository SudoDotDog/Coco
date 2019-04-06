/**
 * @author WMXPY
 * @namespace Core
 * @description Coco
 */

import { isCallingRoot } from "../command/util";
import { CocoEventArgs, CocoEventLister, CORE_EVENT } from "../event/declare";
import { ERROR_CODE, panic } from "../panic/declare";
import { Command } from "./command";

export class Coco {

    public static create(): Coco {
        return new Coco();
    }

    private _rootCommand: Command | null;
    private readonly _commands: Command[];

    private readonly _eventListeners: Map<CORE_EVENT, CocoEventLister<any>>;

    private constructor() {

        this._rootCommand = null;
        this._commands = [];

        this._eventListeners = new Map<CORE_EVENT, CocoEventLister<any>>();
    }

    public rootCommand(command: Command): this {
        this._rootCommand = command;
        return this;
    }

    public command(command: Command): this {
        this._commands.push(command);
        return this;
    }

    public on<T extends CORE_EVENT>(event: T, listener: CocoEventLister<T>): this {
        this._eventListeners.set(event, listener);
        return this;
    }

    public async emit<T extends CORE_EVENT>(event: T, ...args: CocoEventArgs[T]): Promise<void> {

        if (this._eventListeners.has(event)) {
            const listener: CocoEventLister<T> = this._eventListeners.get(event) as CocoEventLister<T>;
            await listener(...args);
        }
        return;
    }

    public async go(argv: string[]): Promise<void> {

        const args: string[] = [...argv];

        if (args.length < 2) {
            throw panic.code(ERROR_CODE.INVALID_ARGV, argv.join(' '));
        }

        const environment: string = args.shift() as string;
        const executer: string = args.shift() as string;

        await this.emit(CORE_EVENT.SYSTEM_CALL_INFO, environment, executer);

        if (isCallingRoot(args)) {
            if (this._rootCommand) {
                this._rootCommand.execute(args);
            }
            return;
        }

        const calling: string | undefined = args.shift();

        if (!calling) {
            throw panic.code(ERROR_CODE.INVALID_ARGV, calling as any);
        }

        for (const command of this._commands) {
            if (command.match(calling)) {
                await command.execute(args);
                return;
            }
        }

        await this.emit(CORE_EVENT.FINISH);
        return;
    }
}
