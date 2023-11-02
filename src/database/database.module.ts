import {ContainerModule} from "inversify";
import {DatabaseEnum} from "./database.enum";
import {PrismaService} from "./prisma.service";

export const DatabaseModule = new ContainerModule(bind => {
    bind(DatabaseEnum.prismaService).to(PrismaService).inSingletonScope()
})
