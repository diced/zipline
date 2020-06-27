import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Shorten {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column("text")
    origin: string;

    @Column("text")
    url: string;

    @Column("text", { default: "" })
    key: string;

    @Column("bigint")
    user: number;

    @Column("bigint", { default: 0 })
    views: number

    set(options: { key: string, origin: string, url: string, user: number }) {
        this.key = options.key;
        this.origin = options.origin;
        this.url = options.url;
        this.user = options.user;
        this.views = 0;
        return this;
    }
}