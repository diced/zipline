import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Image {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column("text")
    url: string;

    @Column("bigint")
    user: number;

    @Column("bigint", { default: 0 })
    views: number;

    set(options: { url: string, user: number }) {
        this.url = options.url;
        this.user = options.user;
        this.views = 0;
        return this;
    }
}